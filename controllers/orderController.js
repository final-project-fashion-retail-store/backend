const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Order = require('../models/orderModel');
const Cart = require('../models/cartModel');
const User = require('../models/userModel');
const { calculateOrderTotals } = require('../utils/order');

// Create order from cart
exports.createOrderFromCart = catchAsync(async (req, res, next) => {
	const userId = req.user._id;
	const {
		shippingAddress,
		billingAddress,
		paymentMethod = 'stripe',
		shippingCost = 0,
		taxRate = 0.1,
	} = req.body;

	// Validate required addresses
	if (!shippingAddress || !billingAddress) {
		return next(new AppError('Shipping and billing addresses are required', 400));
	}

	// Get user's cart with populated product details
	const cart = await Cart.findOne({ user: userId }).populate({
		path: 'items.product',
	});

	if (!cart || cart.items.length === 0) {
		return next(new AppError('Cart is empty', 400));
	}

	// Get available cart items
	const availableItems = cart.items.filter((cartItem) => {
		const product = cartItem.product;
		const variant = cartItem.product.variants.find(
			(v) => v._id.toString() === cartItem.variantId.toString()
		);

		// Check if product exists, variant exists, and variant has sufficient inventory
		return product && variant && variant.inventory >= cartItem.quantity;
	});

	// Transform cart items to order items format
	const orderItems = availableItems.map((cartItem) => {
		const product = cartItem.product;
		const variant = cartItem.product.variants.find(
			(v) => v._id.toString() === cartItem.variantId.toString()
		);

		const image = product.colorImages.get(variant.color)[0].url;

		return {
			productId: product._id,
			variantId: variant._id,
			quantity: cartItem.quantity,
			price: variant.salePrice,
			importPrice: product.importPrice,
			name: product.name,
			image,
		};
	});

	// Calculate totals
	const totals = calculateOrderTotals(orderItems, shippingCost, taxRate);

	// Create order
	const order = await Order.create({
		user: userId,
		items: orderItems,
		shippingAddress,
		billingAddress,
		paymentMethod,
		paymentDetails: {
			provider: paymentMethod,
			status: 'pending',
		},
		subtotal: totals.subtotal,
		shippingCost: shippingCost,
		taxAmount: totals.taxAmount,
		totalAmount: totals.totalAmount,
		status: 'pending',
	});

	// Create payment intent if using Stripe
	let clientSecret = null;
	if (paymentMethod === 'stripe') {
		const paymentIntent = await stripe.paymentIntents.create({
			amount: Math.round(totals.totalAmount * 100),
			currency: 'usd',
			metadata: {
				userId: userId.toString(),
				orderNumber: order.orderNumber,
				orderId: order._id.toString(), // Add orderId to metadata for easier lookup
			},
			automatic_payment_methods: {
				enabled: true,
			},
		});

		console.log('Created payment intent:', paymentIntent.id);
		console.log('Updating order:', order._id, 'with transaction ID');

		// Update order with payment details
		order.paymentDetails.transactionId = paymentIntent.id;
		await order.save();

		console.log(
			'Order saved with transaction ID:',
			order.paymentDetails.transactionId
		);

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

	// Check if user owns this order (fixed the field name from userId to user)
	if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
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

// Stripe webhook handler - FIXED VERSION
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

	console.log(`Received webhook event: ${event.type}`);

	// Handle the event
	switch (event.type) {
		case 'payment_intent.succeeded':
			const paymentIntent = event.data.object;
			console.log('Processing payment_intent.succeeded for:', paymentIntent.id);

			try {
				// First, let's check all orders to see what transaction IDs exist
				const allOrders = await Order.find(
					{},
					'paymentDetails.transactionId orderNumber'
				).lean();
				console.log('All orders with transaction IDs:', allOrders);

				// Update order status
				const order = await Order.findOne({
					'paymentDetails.transactionId': paymentIntent.id,
				});

				if (order) {
					console.log('Found order:', order.orderNumber);

					// Update order status and payment details
					order.status = 'processing';
					order.paymentDetails.status = 'paid';
					order.updatedAt = new Date();

					await order.save();
					console.log('Order updated successfully:', order.orderNumber);

					// Clear user's cart after successful payment
					const cartResult = await Cart.findOneAndUpdate(
						{ user: order.user },
						{ $set: { items: [] } },
						{ new: true }
					);

					if (cartResult) {
						console.log('Cart cleared for user:', order.user);
					} else {
						console.log('No cart found for user:', order.user);
					}

					console.log('Order confirmed and cart cleared:', order.orderNumber);
				} else {
					console.log('No order found for payment intent:', paymentIntent.id);

					// Let's also try to find by order ID from metadata
					if (paymentIntent.metadata && paymentIntent.metadata.orderId) {
						console.log(
							'Trying to find order by ID from metadata:',
							paymentIntent.metadata.orderId
						);
						const orderById = await Order.findById(paymentIntent.metadata.orderId);
						if (orderById) {
							console.log('Found order by metadata ID:', orderById.orderNumber);
							console.log(
								'Order transaction ID:',
								orderById.paymentDetails.transactionId
							);

							// Update this order with the correct transaction ID and status
							orderById.paymentDetails.transactionId = paymentIntent.id;
							orderById.status = 'processing';
							orderById.paymentDetails.status = 'paid';
							orderById.updatedAt = new Date();

							await orderById.save();
							console.log('Updated order via metadata lookup:', orderById.orderNumber);

							// Clear user's cart
							await Cart.findOneAndUpdate(
								{ user: orderById.user },
								{ $set: { items: [] } }
							);
						}
					}
				}
			} catch (error) {
				console.error('Error processing payment_intent.succeeded:', error);
			}
			break;

		case 'payment_intent.payment_failed':
			const failedPayment = event.data.object;
			console.log(
				'Processing payment_intent.payment_failed for:',
				failedPayment.id
			);

			try {
				// Update order status
				const failedOrder = await Order.findOne({
					'paymentDetails.transactionId': failedPayment.id,
				});

				if (failedOrder) {
					console.log('Found failed order:', failedOrder.orderNumber);

					failedOrder.paymentDetails.status = 'failed';
					failedOrder.updatedAt = new Date();

					await failedOrder.save();
					console.log('Payment failed for order:', failedOrder.orderNumber);
				} else {
					console.log('No order found for failed payment intent:', failedPayment.id);
				}
			} catch (error) {
				console.error('Error processing payment_intent.payment_failed:', error);
			}
			break;

		default:
			console.log(`Unhandled event type ${event.type}`);
	}

	res.status(200).json({ received: true });
});
