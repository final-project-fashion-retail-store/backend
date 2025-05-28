const User = require('../models/userModel');
const Address = require('../models/addressModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const handlerFactory = require('./handlerFactory');
const APIFeatures = require('../utils/apiFeatures');

const filteredBody = (bodyObj, ...disallowedFields) => {
	const newObj = { ...bodyObj };
	disallowedFields.forEach((field) => delete newObj[field]);

	return newObj;
};

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

// Address
exports.addAddress = handlerFactory.createOne(Address, true);
exports.setDefaultAddress = catchAsync(async (req, res, next) => {
	const address = await Address.findById(req.params.id);
	if (!address) {
		return next(new AppError('Address does not exist', 404));
	}

	if (address.user.toString() !== req.user.id) {
		return next(new AppError('You do not own this address', 403));
	}

	if (address.isDefault) {
		return next(new AppError('This address is already set as default', 400));
	}

	address.isDefault = true;
	await address.save();

	res.status(200).json({
		status: 'success',
		data: {
			address,
		},
	});
});

exports.getAllUserAddresses = catchAsync(async (req, res) => {
	const addresses = await Address.find({ user: req.user.id }).select(
		'-__v -createdAt -updatedAt -active'
	);

	res.status(200).json({
		status: 'success',
		data: {
			addresses,
		},
	});
});

exports.deleteAddress = catchAsync(async (req, res, next) => {
	const address = await Address.findById(req.params.addressId);
	if (!address) {
		return next(new AppError('Address does not exist', 404));
	}

	if (address.user.toString() !== req.user.id) {
		return next(new AppError('You do not own this address', 403));
	}

	if (address.isDefault) {
		return next(new AppError('Cannot delete default address', 400));
	}

	address.active = false;
	await address.save();

	res.status(204).json({
		status: 'success',
		data: null,
	});
});

// Management
exports.createUser = handlerFactory.createOne(User);
exports.getAllUsers = handlerFactory.getAll(User, 'users');
exports.getUser = handlerFactory.getOne(User, 'addresses');
exports.updateUser = handlerFactory.updateOne(User);
exports.deleteUser = handlerFactory.deleteOne(User);
