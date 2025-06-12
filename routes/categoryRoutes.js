const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const categoryController = require('../controllers/categoryController');

router.use(authController.protect);

// Management
router
	.route('/')
	.get(
		authController.restrictTo('admin', 'staff'),
		categoryController.getAllCategories
	)
	.post(
		authController.restrictTo('admin', 'staff'),
		categoryController.createCategory
	);

router
	.route('/:id')
	.get(
		authController.restrictTo('admin', 'staff'),
		categoryController.getCategory
	)
	.patch(
		authController.restrictTo('admin', 'staff'),
		categoryController.updateCategory
	)
	.delete(
		authController.restrictTo('admin', 'staff'),
		categoryController.deleteCategory
	);

module.exports = router;
