const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const userController = require('../controllers/userController');

router.route('/signup').post(authController.signup);
router.route('/login').post(authController.login);
router.route('/logout').get(authController.logout);
// router.route('/forgot-password').post();
// router.route('/reset-password/:token').patch();

router.use(authController.protect);
router.route('/current-user').get(userController.getCurrentUser);

module.exports = router;
