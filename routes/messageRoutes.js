const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const messageController = require('../controllers/messageController');

router.use(authController.protect);

router.get(
	'/users-in-sidebar',
	authController.restrictTo('staff'),
	messageController.getUsersInSidebar
);
router
	.route('/:id')
	.get(authController.restrictTo('user', 'staff'), messageController.getMessages)
	.post(
		authController.restrictTo('user', 'staff'),
		messageController.sendMessage
	)
	.patch(
		authController.restrictTo('user', 'staff'),
		messageController.messagesRead
	);

module.exports = router;
