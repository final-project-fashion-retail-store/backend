const Product = require('../models/productModel');
const handlerFactory = require('./handlerFactory');

exports.getProduct = handlerFactory.getOne(
	Product,
	[
		{ path: 'category', select: 'name slug' },
		{ path: 'brand', select: 'name logo' },
	],
	true
);
exports.getAllProducts = handlerFactory.getAll(Product, 'products', [
	{ path: 'category', select: 'name slug' },
	{ path: 'brand', select: 'name logo' },
]);
exports.createProduct = handlerFactory.createOne(Product);
exports.updateProduct = handlerFactory.updateOne(Product);
exports.deleteProduct = handlerFactory.deleteOne(Product);
