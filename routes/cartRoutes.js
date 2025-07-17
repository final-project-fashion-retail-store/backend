const express = require('express');
const router = express.Router();

const cartController = require('../controllers/cartController');
const authController = require('../controllers/authController');

router.use(authController.protect, authController.restrictTo('user'));

router
	.route('/')
	.get(cartController.getCart)
	.post(cartController.addToCart)
	.patch(cartController.updateCartProduct)
	.delete(cartController.removeFromCart);

module.exports = router;
