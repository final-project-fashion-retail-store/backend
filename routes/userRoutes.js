const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const userController = require('../controllers/userController');

router.use(authController.protect);
router.route('/current-user').get(userController.getCurrentUser);
router.route('/edit-profile').patch(userController.editProfile);
router.route('/deactivate/:id').delete(userController.deactivateAccount);

// Management
router
	.route('/')
	.get(authController.restrictTo('admin'), userController.getAllUsers)
	.post(authController.restrictTo('admin'), userController.createUser);

router
	.route('/stats')
	.get(authController.restrictTo('admin'), userController.getUserStats);

router
	.route('/:id')
	.get(authController.restrictTo('admin'), userController.getUser)
	.patch(authController.restrictTo('admin'), userController.updateUser)
	.delete(authController.restrictTo('admin'), userController.deleteUser);

module.exports = router;
