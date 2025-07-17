const Wishlist = require('../models/wishlistModel');
const Product = require('../models/productModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const apiFeatures = require('../utils/apiFeatures');

exports.addToWishlist = catchAsync(async (req, res, next) => {
	const { productId } = req.body;

	// check the existence of the product
	const product = await Product.findById(productId);
	if (!product) {
		return next(new AppError('Product not found', 404));
	}

	// check if the product is already in the user's wishlist
	const existingWishlistItem = await Wishlist.findOne({
		user: req.user._id,
		product: productId,
	});

	if (existingWishlistItem) {
		return next(new AppError('Product is already in the wishlist', 400));
	}

	const wishlist = new Wishlist({
		user: req.user._id,
		product: productId,
	});

	await wishlist.save();
	await wishlist.populate('product');

	res.status(201).json({
		status: 'success',
		data: { wishlist },
	});
});

exports.getAllWishlistItems = catchAsync(async (req, res, next) => {
	let query = Wishlist.find({ user: req.user._id });

	// Apply API features
	const features = new apiFeatures(query, req.query)
		.filter()
		.sort()
		.limitFields();

	// Get pagination info
	const paginationInfo = await features.paginate();

	// Execute the query
	const wishlistItems = await features.query;

	res.status(200).json({
		status: 'success',
		results: wishlistItems.length,
		data: {
			wishlistItems,
			pagination: {
				...paginationInfo,
				nextPage: paginationInfo.nextPage
					? `${process.env.BASE_URL}/api/v1/wishlist${paginationInfo.nextPage}`
					: null,
				prevPage: paginationInfo.prevPage
					? `${process.env.BASE_URL}/api/v1/wishlist${paginationInfo.prevPage}`
					: null,
			},
		},
	});
});

exports.removeFromWishlist = catchAsync(async (req, res, next) => {
	const { productId } = req.params;

	// check if the product is in the user's wishlist
	const wishlistItem = await Wishlist.findOneAndDelete({
		user: req.user._id,
		product: productId,
	});

	if (!wishlistItem) {
		return next(new AppError('Product not found in the wishlist', 404));
	}

	res.status(204).json({
		status: 'success',
		data: null,
	});
});

exports.getWishlistCount = catchAsync(async (req, res) => {
	const totalWishlist = await Wishlist.countDocuments({ user: req.user._id });

	res.status(200).json({
		status: 'success',
		data: {
			totalWishlist,
		},
	});
});
