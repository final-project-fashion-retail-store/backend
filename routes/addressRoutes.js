const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const addressController = require('../controllers/addressController');

router.use(authController.protect);

// Management
router
	.route('/')
	.get(
		authController.restrictTo('admin', 'staff'),
		addressController.getAddresses
	)
	.post(
		authController.restrictTo('admin', 'staff'),
		addressController.createAddress
	);

router
	.route('/:id')
	.get(authController.restrictTo('admin', 'staff'), addressController.getAddress)
	.patch(
		authController.restrictTo('admin', 'staff'),
		addressController.updateAddress
	)
	.delete(
		authController.restrictTo('admin', 'staff'),
		addressController.deleteAddress
	);

router
	.route('/delete-addresses/:userId')
	.delete(authController.restrictTo('admin'), addressController.deleteAddresses);

module.exports = router;
