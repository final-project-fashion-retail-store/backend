const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const wishlistController = require('../controllers/wishlistController');

router.use(authController.protect, authController.restrictTo('user'));

router.post('/', wishlistController.addToWishlist);
router.get('/', wishlistController.getAllWishlistItems);
router.get('/total', wishlistController.getWishlistCount);
router.delete('/:productId', wishlistController.removeFromWishlist);

module.exports = router;
