const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Order = require('../models/orderModel');
const Cart = require('../models/cartModel');
const User = require('../models/userModel');
const { calculateOrderTotals } = require('../utils/order');

// Create Payment Intent
exports.createPaymentIntent = catchAsync(async (req, res, next) => {
	const { totalAmount, currency = 'usd', orderNumber, metadata = {} } = req.body;

	if (!totalAmount) {
		return next(new AppError('Total amount is required', 400));
	}

	try {
		const paymentIntent = await stripe.paymentIntents.create({
			amount: Math.round(totalAmount * 100), // Convert to cents
			currency: currency.toLowerCase(),
			metadata: {
				userId: req.user?.id || 'guest',
				orderNumber: orderNumber || Date.now().toString(),
				...metadata,
			},
			automatic_payment_methods: {
				enabled: true,
			},
		});

		res.status(200).json({
			status: 'success',
			data: {
				clientSecret: paymentIntent.client_secret,
				paymentIntentId: paymentIntent.id,
			},
		});
	} catch (error) {
		return next(
			new AppError(`Payment intent creation failed: ${error.message}`, 400)
		);
	}
});

// Create order from cart
exports.createOrderFromCart = catchAsync(async (req, res, next) => {
	const userId = req.user._id;
	const {
		shippingAddress,
		billingAddress,
		paymentMethod = 'stripe',
		shippingCost = 0,
		taxRate = 0.1,
		notes,
	} = req.body;

	// Validate required addresses
	if (!shippingAddress || !billingAddress) {
		return next(new AppError('Shipping and billing addresses are required', 400));
	}

	// Get user's cart with populated product details
	const cart = await Cart.findOne({ user: userId })
		.populate({
			path: 'items.product',
			select: 'name price images',
		})
		.populate({
			path: 'items.variantId',
			select: 'price importPrice',
		});

	if (!cart || cart.items.length === 0) {
		return next(new AppError('Cart is empty', 400));
	}

	// Transform cart items to order items format
	const orderItems = cart.items.map((cartItem) => {
		const product = cartItem.product;
		const variant = cartItem.variantId;

		return {
			productId: product._id,
			variantId: variant?._id,
			quantity: cartItem.quantity,
			price: variant?.salePrice,
			importPrice: product.importPrice,
			name: product.name,
			image: product.images[0].url,
		};
	});

	// Calculate totals
	const totals = calculateOrderTotals(orderItems, shippingCost, taxRate);

	// Create order
	const order = await Order.create({
		userId: userId,
		items: orderItems,
		shippingAddress: shippingAddress,
		billingAddress: billingAddress,
		paymentMethod: paymentMethod,
		paymentDetails: {
			provider: paymentMethod,
			status: 'pending',
		},
		subtotal: totals.subtotal,
		shippingCost: shippingCost,
		taxAmount: totals.taxAmount,
		totalAmount: totals.totalAmount,
		status: 'pending',
		notes: notes,
	});

	// Create payment intent if using Stripe
	let clientSecret = null;
	if (paymentMethod === 'stripe') {
		const paymentIntent = await stripe.paymentIntents.create({
			amount: Math.round(totals.totalAmount * 100),
			currency: 'usd',
			metadata: {
				userId: userId,
				orderNumber: order.orderNumber,
			},
			automatic_payment_methods: {
				enabled: true,
			},
		});

		// Update order with payment details
		order.paymentDetails.transactionId = paymentIntent.id;
		await order.save();

		clientSecret = paymentIntent.client_secret;
	}

	res.status(201).json({
		status: 'success',
		data: {
			order: order,
			clientSecret: clientSecret,
		},
	});
});

// Cancel order
exports.cancelOrder = catchAsync(async (req, res, next) => {
	const { id } = req.params;

	const order = await Order.findById(id);

	if (!order) {
		return next(new AppError('Order not found', 404));
	}

	// Check if user owns this order
	if (order.userId.toString() !== req.user.id && req.user.role !== 'admin') {
		return next(new AppError('You can only cancel your own orders', 403));
	}

	// Check if order can be cancelled
	if (['delivered', 'cancelled'].includes(order.status)) {
		return next(new AppError('This order cannot be cancelled', 400));
	}

	// Cancel payment intent if exists and order is still pending
	if (order.paymentDetails.transactionId && order.status === 'pending') {
		try {
			await stripe.paymentIntents.cancel(order.paymentDetails.transactionId);
			order.paymentDetails.status = 'cancelled';
		} catch (error) {
			console.log('Error cancelling payment intent:', error.message);
		}
	}

	order.status = 'cancelled';
	order.updatedAt = Date.now();
	await order.save();

	res.status(200).json({
		status: 'success',
		data: {
			order,
		},
	});
});

// Stripe webhook handler
exports.stripeWebhook = catchAsync(async (req, res, next) => {
	const sig = req.headers['stripe-signature'];
	let event;

	try {
		event = stripe.webhooks.constructEvent(
			req.body,
			sig,
			process.env.STRIPE_WEBHOOK_SECRET
		);
	} catch (err) {
		console.log('Webhook signature verification failed.', err.message);
		return res.status(400).send(`Webhook Error: ${err.message}`);
	}

	// Handle the event
	switch (event.type) {
		case 'payment_intent.succeeded':
			const paymentIntent = event.data.object;

			// Update order status
			const order = await Order.findOne({
				'paymentDetails.transactionId': paymentIntent.id,
			});

			if (order) {
				order.status = 'processing';
				order.paymentDetails.status = 'paid';
				order.updatedAt = Date.now();
				await order.save();

				// Clear user's cart after successful payment
				await Cart.findOneAndUpdate(
					{ user: order.userId },
					{ $set: { items: [] } }
				);

				console.log('Order confirmed:', order.orderNumber);
			}
			break;

		case 'payment_intent.payment_failed':
			const failedPayment = event.data.object;

			// Update order status
			const failedOrder = await Order.findOne({
				'paymentDetails.transactionId': failedPayment.id,
			});

			if (failedOrder) {
				failedOrder.paymentDetails.status = 'failed';
				failedOrder.updatedAt = Date.now();
				await failedOrder.save();

				console.log('Payment failed for order:', failedOrder.orderNumber);
			}
			break;

		default:
			console.log(`Unhandled event type ${event.type}`);
	}

	res.status(200).json({ received: true });
});
