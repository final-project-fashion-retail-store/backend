const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');

router.route('/signup').post(authController.signup);
router.route('/login').post(authController.login);
router.route('/logout').delete(authController.logout);
router.route('/refresh-token').get(authController.refreshToken);
router.route('/forgot-password').post(authController.forgotPassword);
router.route('/reset-password/:token').patch(authController.resetPassword);

// Google OAuth route
router.get('/google/callback', authController.googleCallback);

router.use(authController.protect);
router.route('/change-password').patch(authController.updatePassword);

module.exports = router;
