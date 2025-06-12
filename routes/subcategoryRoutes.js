const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const subcategoryController = require('../controllers/subcategoryController');

router.use(authController.protect);

router
	.route('/')
	.get(
		authController.restrictTo('admin', 'staff'),
		subcategoryController.getAllSubcategories
	)
	.post(
		authController.restrictTo('admin', 'staff'),
		subcategoryController.createSubcategory
	);

router
	.route('/:id')
	.get(
		authController.restrictTo('admin', 'staff'),
		subcategoryController.getSubcategory
	)
	.patch(
		authController.restrictTo('admin', 'staff'),
		subcategoryController.updateSubcategory
	)
	.delete(
		authController.restrictTo('admin', 'staff'),
		subcategoryController.deleteSubcategory
	);

module.exports = router;
