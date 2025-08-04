const Subcategory = require('../models/subcategoryModel');
const handlerFactory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getSubcategory = handlerFactory.getOne(Subcategory);
exports.getAllSubcategories = handlerFactory.getAll(
	Subcategory,
	'subcategories',
	{
		path: 'parentCategory',
		transform: (doc) => {
			return { _id: doc.id, name: doc.name };
		},
	},
	true
);
exports.createSubcategory = handlerFactory.createOne(Subcategory);
exports.updateSubcategory = handlerFactory.updateOne(Subcategory);
exports.deleteSubcategory = handlerFactory.deleteOne(Subcategory);
