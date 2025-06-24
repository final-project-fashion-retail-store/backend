const Message = require('../models/messageModel');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { io, getReceiverSocketId } = require('../utils/socket');

// Get all users in sidebar of staff chat
exports.getUsersInSidebar = catchAsync(async (req, res, next) => {
	const staffId = req.user._id;
	const users = await Message.aggregate([
		{
			$match: {
				$or: [{ sender: staffId }, { receiver: staffId }],
			},
		},
		{
			$project: {
				customerId: {
					$cond: [{ $eq: ['$sender', staffId] }, '$receiver', '$sender'],
				},
				text: 1,
				isRead_message: '$isRead',
				sender_message: '$sender',
				createdAt: 1,
			},
		},
		{
			$sort: { createdAt: -1 }, // Sort by newest first
		},
		{
			$group: {
				_id: '$customerId',
				lastMessage: { $first: '$text' },
				lastMessageAt: { $first: '$createdAt' },
				lastMessageIsReadByReceiver: { $first: '$isRead_message' },
				lastMessageSender: { $first: '$sender_message' },
			},
		},
		{
			$lookup: {
				from: 'users',
				localField: '_id',
				foreignField: '_id',
				as: 'user',
			},
		},
		{
			$unwind: '$user',
		},
		{
			$project: {
				customerId: '$_id',
				name: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
				email: '$user.email',
				avatar: '$user.avatar',
				lastMessage: 1,
				lastMessageAt: 1,
				isRead: {
					$cond: [
						{
							$and: [
								// Last message was sent by the customer (not by staff)
								{ $ne: ['$lastMessageSender', staffId] },
								// And that message (received by staff) is marked as unread
								{ $eq: ['$lastMessageIsReadByReceiver', false] },
							],
						},
						false,
						true,
					],
				},
			},
		},
		{
			$sort: {
				lastMessageAt: -1, // show newest conversation on top
			},
		},
	]);

	res.status(200).json({
		status: 'success',
		results: users.length,
		data: {
			customers: users,
		},
	});
});

exports.getMessages = catchAsync(async (req, res) => {
	const { id: userToChatId } = req.params;
	const myId = req.user._id;

	const messages = await Message.find({
		$or: [
			{ sender: myId, receiver: userToChatId },
			{ sender: userToChatId, receiver: myId },
		],
	});

	res.status(200).json({
		status: 'success',
		data: {
			messages,
		},
	});
});

exports.sendMessage = catchAsync(async (req, res) => {
	const { text } = req.body;
	const { id: receiver } = req.params;
	const sender = req.user._id;

	const newMessage = new Message({
		sender,
		receiver: receiver,
		text,
	});

	await newMessage.save();

	// handle update of sidebar chat
	let senderUser, sidebarPayload;
	senderUser = await User.findById(sender);
	if (senderUser.role === 'user') {
		sidebarPayload = {
			_id: senderUser._id.toString(),
			name: `${senderUser.firstName} ${senderUser.lastName}`,
			email: senderUser.email,
			avatar: senderUser.avatar,
			lastMessage: newMessage.text,
			lastMessageAt: newMessage.createdAt,
			isRead: false,
		};
	} else if (senderUser.role === 'staff') {
		// receiver is a customer
		const receiverUser = await User.findById(receiver);
		sidebarPayload = {
			_id: receiverUser._id.toString(),
			name: `${receiverUser.firstName} ${receiverUser.lastName}`,
			email: receiverUser.email,
			avatar: receiverUser.avatar,
			lastMessage: newMessage.text,
			lastMessageAt: newMessage.createdAt,
			isRead: true,
		};
	}

	const receiverSocketId = getReceiverSocketId(receiver);
	const senderSocketId = getReceiverSocketId(sender.toString());

	if (receiverSocketId) {
		io.to(receiverSocketId).emit('newMessage', newMessage);
		if (senderUser.role === 'user') {
			io.to(receiverSocketId).emit('sidebarChatUpdate', sidebarPayload);
		}
	}

	if (senderSocketId && senderUser.role === 'staff') {
		io.to(senderSocketId).emit('sidebarChatUpdate', sidebarPayload);
	}

	res.status(201).json({
		status: 'success',
		data: {
			message: newMessage,
		},
	});
});

exports.messagesRead = catchAsync(async (req, res) => {
	const { id: userToChatId } = req.params;
	const myId = req.user._id;

	await Message.updateMany(
		{
			$or: [
				{ sender: userToChatId, receiver: myId },
				{ sender: myId, receiver: userToChatId },
			],
			isRead: false,
		},
		{ isRead: true }
	);

	const receiverSocketId = getReceiverSocketId(myId.toString());
	if (receiverSocketId) {
		// console.log('Emitting sidebarReadUpdate to receiver');
		io.to(receiverSocketId).emit('sidebarReadUpdate', userToChatId);
	}

	res.status(200).json({
		status: 'success',
		data: {
			message: 'Messages marked as read',
		},
	});
});
