const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const userController = require('../controllers/userController');

router.use(authController.protect);
router.route('/current-user').get(userController.getCurrentUser);
router.route('/edit-profile').patch(userController.editProfile);
router.route('/deactivate/:id').delete(userController.deactivateAccount);
router.route('/add-address').post(userController.addAddress);
router
	.route('/set-default-address/:id')
	.patch(userController.setDefaultAddress);
router.route('/addresses').get(userController.getAllUserAddresses);
router.route('/addresses/:addressId').delete(userController.deleteAddress);
// Management
router
	.route('/')
	.get(authController.restrictTo('admin', 'staff'), userController.getAllUsers)
	.post(authController.restrictTo('admin'), userController.createUser);

router
	.route('/:id')
	.get(authController.restrictTo('admin', 'staff'), userController.getUser)
	.patch(authController.restrictTo('admin', 'staff'), userController.updateUser)
	.delete(
		authController.restrictTo('admin', 'staff'),
		userController.deleteUser
	);

module.exports = router;
