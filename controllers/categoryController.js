const Category = require('../models/categoryModel');
const Subcategory = require('../models/subcategoryModel');
const handlerFactory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getAllCategoriesWithSubcategories = handlerFactory.getAll(
	Category,
	'categories',
	{
		path: 'subcategories',
		select: '-__v -active',
	}
);

// Management
exports.getCategory = handlerFactory.getOne(Category);
exports.getAllCategories = handlerFactory.getAll(Category, 'categories');
exports.createCategory = handlerFactory.createOne(Category);
exports.updateCategory = handlerFactory.updateOne(Category);
exports.deleteCategory = catchAsync(async (req, res, next) => {
	const category = await Category.findById(req.params.id);
	if (!category) {
		return next(new AppError('Category does not exist', 404));
	}

	// Delete all subcategories first
	await Subcategory.deleteMany({ parentCategory: req.params.id });

	// Then delete the category
	await Category.findByIdAndDelete(req.params.id);

	res.status(204).json({
		status: 'success',
		data: null,
	});
});
