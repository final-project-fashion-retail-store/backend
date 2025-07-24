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
	const features = new apiFeatures(query, req.query)
		.filter()
		.sort()
		.limitFields();

	// Get pagination info
	const paginationInfo = await features.paginate();

	// Execute the query with population
	const reviews = await features.query.populate('user', 'name avatar');

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
				nextPage: paginationInfo.nextPage,
				prevPage: paginationInfo.prevPage,
			},
		},
	});
});

exports.createReview = catchAsync(async (req, res, next) => {
	// Check whether the review is expired
	const order = await Order.findById(req.body.orderId);
	const orderItem = order.items.find(
		(item) =>
			item.product.toString() === req.body.productId &&
			item.variantId.toString() === req.body.variantId
	);

	if (orderItem.status !== 'delivered') {
		return next(new AppError('You can only review delivered products', 400));
	}

	if (orderItem.reviewed) {
		return next(new AppError('You have already reviewed this product', 400));
	}

	if (orderItem.reviewExpired) {
		return next(new AppError('Review period has expired', 400));
	}

	// Ensure the user is the one who made the order
	if (order.user.toString() !== req.user._id.toString()) {
		return next(new AppError('You can only review your own orders', 403));
	}

	// Create the review
	const newReview = await Review.create({
		user: req.user._id,
		product: req.body.productId,
		rating: req.body.rating,
		title: req.body.title,
		comment: req.body.comment,
		images: req.body.images,
	});

	// Update the order item to mark it as reviewed
	orderItem.reviewed = true;
	orderItem.reviewExpireDate = undefined; // Clear the expire date since review is done
	await order.save();

	res.status(201).json({
		status: 'success',
		data: {
			review: newReview,
		},
	});
});
