const Brand = require('../models/brandModel');
const Product = require('../models/productModel');
const handlerFactory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getBrand = handlerFactory.getOne(Brand);
exports.getAllBrands = handlerFactory.getAll(Brand);
exports.createBrand = handlerFactory.createOne(Brand);
exports.updateBrand = handlerFactory.updateOne(Brand);
exports.deleteBrand = catchAsync(async (req, res, next) => {
	const { id } = req.params;

	// check brand exists
	const brand = Brand.findById(id);
	if (!brand) {
		return next(new AppError('The brand does not exist', 404));
	}

	// Check if this brand is having any product. If any -> respond error
	const products = Product.find({ brand: id });
	if (products.length > 0) {
		return next(
			new AppError('Failed to delete brand. Please delete the products first', 400)
		);
	}

	// delete brand
	await Brand.findByIdAndDelete(id);

	res.status(204).json({
		status: 'success',
		data: null,
	});
});

exports.getBrandStats = catchAsync(async (req, res, next) => {
	const [brandStats] = await Brand.aggregate([
		{
			$group: {
				_id: null,
				totalBrands: { $sum: 1 },
				featuredBrands: {
					$sum: {
						$cond: [{ $eq: ['$featuredBrand', true] }, 1, 0],
					},
				},
				activeBrand: {
					$sum: {
						$cond: [{ $eq: ['$active', true] }, 1, 0],
					},
				},
			},
		},
	]);

	const [productStats] = await Product.aggregate([
		{
			$group: {
				_id: null,
				totalProducts: { $sum: 1 },
			},
		},
	]);

	res.status(200).json({
		status: 'success',
		data: {
			totalBrands: brandStats?.totalBrands || 0,
			activeBrands: brandStats?.activeBrand || 0,
			featuredBrands: brandStats?.featuredBrands || 0,
			totalProducts: productStats?.totalProducts || 0,
		},
	});
});
