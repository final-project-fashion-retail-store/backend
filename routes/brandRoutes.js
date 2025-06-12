const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const brandController = require('../controllers/brandController');

router.use(authController.protect);

router
	.route('/')
	.get(authController.restrictTo('admin', 'staff'), brandController.getAllBrands)
	.post(
		authController.restrictTo('admin', 'staff'),
		brandController.createBrand
	);

router
	.route('/stats')
	.get(
		authController.restrictTo('admin', 'staff'),
		brandController.getBrandStats
	);

router
	.route('/:id')
	.get(authController.restrictTo('admin', 'staff'), brandController.getBrand)
	.patch(
		authController.restrictTo('admin', 'staff'),
		brandController.updateBrand
	)
	.delete(
		authController.restrictTo('admin', 'staff'),
		brandController.deleteBrand
	);

module.exports = router;
