const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const productController = require('../controllers/productController');

router.route('/').get(productController.getAllProducts);

router.use(authController.protect);

router
	.route('/admin')
	.get(
		authController.restrictTo('admin', 'staff'),
		productController.getAllProducts
	)
	.post(
		authController.restrictTo('admin', 'staff'),
		productController.createProduct
	);

router
	.route('/:id')
	.get(authController.restrictTo('admin', 'staff'), productController.getProduct)
	.patch(
		authController.restrictTo('admin', 'staff'),
		productController.updateProduct
	)
	.delete(
		authController.restrictTo('admin', 'staff'),
		productController.deleteProduct
	);

module.exports = router;
