const express = require('express');
const orderController = require('../controllers/orderController');
const authController = require('../controllers/authController');

const router = express.Router();

// Stripe webhook - must be before any middleware that parses body as JSON
router.post(
	'/webhook',
	express.raw({ type: 'application/json' }),
	orderController.stripeWebhook
);

// Protect all routes after this middleware (user must be logged in)
router.use(authController.protect); // Assuming you have protect middleware

// Create payment intent
// router.post('/create-payment-intent', orderController.createPaymentIntent);

// Create order routes
router.post('/create-from-cart', orderController.createOrderFromCart);

// Cancel order (users can cancel their own orders)
router.patch('/:id/cancel', orderController.cancelOrder);

module.exports = router;
