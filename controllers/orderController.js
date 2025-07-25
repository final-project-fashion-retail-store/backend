const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Order = require('../models/orderModel');
const Cart = require('../models/cartModel');
const Product = require('../models/productModel');
const handlerFactory = require('./handlerFactory');
const apiFeatures = require('../utils/apiFeatures');
const {
	calculateOrderTotals,
	updateProductInventory,
} = require('../utils/order');

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
	// console.log(availableItems);
	// Transform cart items to order items format
	const orderItems = availableItems.map((cartItem) => {
		const product = cartItem.product;
		const variant = cartItem.product.variants.find(
			(v) => v._id.toString() === cartItem.variantId.toString()
		);

		const image = product.colorImages.get(variant.color)[0].url;

		return {
			product: product._id,
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
				// Update inventory BEFORE updating order status
				await updateProductInventory(order.items, Product);

				// Update order status
				order.status = 'processing';
				order.paymentDetails.status = 'paid';
				await order.save();

				// Clear user's cart after successful payment
				await Cart.findOneAndUpdate({ user: order.user }, { $set: { items: [] } });

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

// Get user's orders
exports.getUserOrders = catchAsync(async (req, res, next) => {
	const query = Order.find({ user: req.user._id });

	const features = new apiFeatures(query, req.query)
		.filter()
		.sort()
		.limitFields();

	const paginationInfo = await features.paginate();

	// Execute the query with population
	const orders = await features.query.populate(
		'items.product',
		'name variants colorImages'
	);

	res.status(200).json({
		status: 'success',
		results: orders.length,
		data: {
			orders,
			pagination: {
				totalDocs: paginationInfo.totalDocs,
				totalPages: paginationInfo.totalPages,
				currentPage: paginationInfo.currentPage,
				accumulator: paginationInfo.accumulator,
				nextPage: paginationInfo.nextPage
					? `${process.env.BASE_URL}/api/v1/orders/{paginationInfo.nextPage}`
					: null,
				prevPage: paginationInfo.prevPage
					? `${process.env.BASE_URL}/api/v1/orders/${paginationInfo.prevPage}`
					: null,
			},
		},
	});
});

// admin
exports.getAllOrders = handlerFactory.getAll(Order, 'orders', [
	{ path: 'user' },
	{ path: 'items.product' },
]);
exports.updateOrder = handlerFactory.updateOne(Order);
