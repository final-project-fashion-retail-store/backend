const express = require('express');
const orderController = require('../controllers/orderController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router.route('/').get(orderController.getUserOrders);

// Create order routes
router.post('/create-from-cart', orderController.createOrderFromCart);

// Cancel order (users can cancel their own orders)
router.patch('/:id/cancel', orderController.cancelOrder);

// admin
router.use(authController.restrictTo('admin', 'staff'));

router.route('/admin').get(orderController.getAllOrders);
router.route('/:id').patch(orderController.updateOrder);

module.exports = router;
