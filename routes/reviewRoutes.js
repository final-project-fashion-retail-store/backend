const express = require('express');
const router = express.Router();

const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

router.route('/:productId').get(reviewController.getReviews);

router.use(authController.protect, authController.restrictTo('user'));

router.route('/').post(reviewController.createReview);

module.exports = router;
