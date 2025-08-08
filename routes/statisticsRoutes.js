const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const statisticsController = require('../controllers/statisticsController');

router.use(authController.protect, authController.restrictTo('admin', 'staff'));

router.get('/overview', statisticsController.getBusinessInsights);

router.get('/revenue-trends', statisticsController.getRevenueTrends);

router.get('/payment-methods', statisticsController.getPaymentMethods);

router.get('/order-status', statisticsController.getOrderStatus);

router.get('/top-products', statisticsController.getTopProducts);

router.get('/user-activity', statisticsController.getUserRegistrationActivity);

router.get('/orders-by-location', statisticsController.getOrdersByLocation);

router.get('/top-customers', statisticsController.getTopCustomers);

router.get(
	'/category-performance',
	statisticsController.getCategoryPerformance
);

router.get('/profit-margins', statisticsController.getProfitMarginsByCategory);

router.get('/ecommerce-metrics', statisticsController.getEcommerceMetrics);

router.get(
	'/product-revenue',
	statisticsController.getProductRevenuePerformance
);

router.get(
	'/product-ratings',
	statisticsController.getProductRatingsDistribution
);

router.get(
	'/wishlist-conversion',
	statisticsController.getWishlistToPurchaseConversion
);

router.get('/inventory-metrics', statisticsController.getInventoryMetrics);

router.get('/inventory-status', statisticsController.getInventoryStatus);

module.exports = router;
