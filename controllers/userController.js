const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const handlerFactory = require('./handlerFactory');
const filteredBody = require('../utils/filterBody');

exports.getCurrentUser = catchAsync(async (req, res, next) => {
	const user = await User.findById(req.user.id).select(
		'-passwordChangedAt -__v -createdAt -updatedAt'
	);
	if (!user) {
		return next(new AppError('User not found', 404));
	}

	res.status(200).json({
		status: 'success',
		data: {
			user,
		},
	});
});

exports.editProfile = catchAsync(async (req, res, next) => {
	// Reject if user tries to update password
	if (req.body.password || req.body.passwordConfirm)
		return next(new AppError('Cannot update password here', 400));

	// Filtering out unwanted fields that are not allowed to be updated, e.g. role
	const allowedBody = filteredBody(req.body, 'role', 'passwordChangedAt');

	const updateUser = await User.findByIdAndUpdate(req.user.id, allowedBody, {
		new: true,
		runValidators: true,
	}).select('-passwordChangedAt -__v -createdAt -updatedAt');

	res.status(200).json({
		status: 'success',
		data: {
			user: updateUser,
		},
	});
});

exports.deactivateAccount = catchAsync(async (req, res, next) => {
	const user = await User.findById(req.user.id);
	if (!user) {
		return next(new AppError('User not found', 404));
	}

	user.active = false;
	await user.save({ validateBeforeSave: false });

	res.status(204).json({
		status: 'success',
		data: null,
	});
});

// Management
exports.getAllUsers = handlerFactory.getAll(User, 'users');
exports.getUser = handlerFactory.getOne(User, 'addresses');
exports.updateUser = handlerFactory.updateOne(User);
exports.deleteUser = handlerFactory.deleteOne(User);

exports.createUser = catchAsync(async (req, res, next) => {
	const data = { ...req.body };

	data.password = 'User1234';
	data.passwordConfirm = 'User1234';

	const users = await User.create(data);

	// Convert to object and remove unwanted fields
	const { __v, createdAt, updatedAt, password, ...cleanDoc } = users.toObject();
	res.status(201).json({
		status: 'success',
		data: {
			user: cleanDoc,
		},
	});
});
