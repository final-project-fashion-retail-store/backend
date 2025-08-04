const Review = require('../models/reviewModel');
const Order = require('../models/orderModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const apiFeatures = require('../utils/apiFeatures');
const handlerFactory = require('./handlerFactory');

exports.getReviews = catchAsync(async (req, res, next) => {
	const { productId } = req.params;

	if (!productId) {
		return next(new AppError('Product ID is required', 400));
	}

	// Base query for the specific product
	let query = Review.find({ product: productId });

	// Apply API features for filtering, sorting, field limiting
	const features = new apiFeatures(query, req.query).sort().limitFields();
	await features.filter();
	// Get pagination info
	const paginationInfo = await features.paginate();

	// Execute the query with population
	const reviews = await features.query
		.populate('user', 'firstName lastName avatar')
		.populate('product', 'colorImages variants name');

	res.status(200).json({
		status: 'success',
		results: reviews.length,
		data: {
			reviews,
			pagination: {
				totalDocs: paginationInfo.totalDocs,
				totalPages: paginationInfo.totalPages,
				currentPage: paginationInfo.currentPage,
				accumulator: paginationInfo.accumulator,
				nextPage: paginationInfo.nextPage
					? `${process.env.BASE_URL}/api/v1/reviews/${productId}${paginationInfo.nextPage}`
					: null,
				prevPage: paginationInfo.prevPage
					? `${process.env.BASE_URL}/api/v1/reviews/${productId}${paginationInfo.prevPage}`
					: null,
			},
		},
	});
});

exports.createReview = catchAsync(async (req, res, next) => {
	// Check whether the review is expired
	const order = await Order.findById(req.body.orderId);

	if (!order) {
		return next(new AppError('Order not found', 404));
	}

	const orderItem = order.items.find(
		(item) =>
			item.product.toString() === req.body.productId &&
			item.variantId.toString() === req.body.variantId
	);

	if (!orderItem) {
		return next(new AppError('Order item not found', 404));
	}

	if (order.status !== 'delivered') {
		return next(new AppError('You can only review delivered products', 400));
	}

	if (orderItem.reviewed) {
		return next(new AppError('You have already reviewed this product', 400));
	}

	if (order.reviewExpired) {
		return next(new AppError('Review period has expired for this order', 400));
	}

	// Ensure the user is the one who made the order
	if (order.user.toString() !== req.user._id.toString()) {
		return next(new AppError('You can only review your own orders', 403));
	}

	// Create the review
	const newReview = await Review.create({
		user: req.user._id,
		product: req.body.productId,
		variantId: req.body.variantId,
		rating: req.body.rating,
		title: req.body.title,
		comment: req.body.comment,
		images: req.body.images,
	});

	await newReview.populate([
		{ path: 'user', select: 'firstName lastName avatar' },
		{ path: 'product', select: 'variants' },
	]);

	// Update the order item to mark it as reviewed
	orderItem.reviewed = true;

	// Check if all items in the order have been reviewed
	const allItemsReviewed = order.items.every((item) => item.reviewed);

	// If all items are reviewed, clear the reviewExpireDate
	if (allItemsReviewed) {
		order.reviewExpireDate = undefined;
	}
	await order.save();

	res.status(201).json({
		status: 'success',
		data: {
			review: newReview,
		},
	});
});

exports.updateReview = catchAsync(async (req, res, next) => {
	const review = await Review.findById(req.params.id);

	if (!review) {
		return next(new AppError('Review not found', 404));
	}

	if (review.user.toString() !== req.user._id.toString()) {
		return next(new AppError('You can only update your own reviews', 403));
	}

	const excludeFields = [
		'_id',
		'user',
		'product',
		'variantId',
		'createdAt',
		'updatedAt',
	];
	const newBody = { ...req.body };
	excludeFields.forEach((field) => delete newBody[field]);

	const updatedReview = await Review.findByIdAndUpdate(req.params.id, newBody, {
		new: true,
		runValidators: true,
	})
		.populate('user', 'firstName lastName avatar')
		.populate('product', 'colorImages variants name');

	res.status(200).json({
		status: 'success',
		data: {
			review: updatedReview,
		},
	});
});
