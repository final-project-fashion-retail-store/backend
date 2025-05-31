const Address = require('../models/addressModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const handlerFactory = require('./handlerFactory');

/*
Upcoming middleware for customer: create new address, edit address, delete address (deactivate)
*/

// get all addresses of a customer
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

// Customer can delete their address
exports.deactivateAddress = catchAsync(async (req, res, next) => {
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
exports.getAddresses = handlerFactory.getAll(Address, 'addresses', {
	path: 'user',
	transform: (doc) => {
		return { email: doc.email };
	},
});
exports.getAddress = handlerFactory.getOne(Address, 'user');
exports.updateAddress = handlerFactory.updateOne(Address);
// exports.deleteAddress = handlerFactory.deleteOne(Address);
exports.deleteAddress = catchAsync(async (req, res, next) => {
	const address = await Address.findById(req.params.id);
	if (!address) {
		return next(new AppError('Address does not exist', 404));
	}

	// Get all active addresses for this user
	const userAddresses = await Address.find({ user: address.user });

	// Check if user has more than one address and trying to delete default address
	if (userAddresses.length > 1 && address.isDefault) {
		return next(
			new AppError(
				'Cannot delete default address. Please set another address as default first.',
				400
			)
		);
	}

	// If user has only one address or deleting non-default address, allow deletion
	await Address.findByIdAndDelete(req.params.id);

	res.status(204).json({
		status: 'success',
		data: null,
	});
});
exports.createAddress = catchAsync(async (req, res) => {
	// check if this is the first address of this user - purpose is to set default the first address
	const data = { ...req.body };
	const addresses = await Address.find({ user: req.body.user });
	if (addresses.length === 0) {
		data.isDefault = true;
	}

	const address = await Address.create(data);

	res.status(201).json({
		status: 'success',
		data: {
			address,
		},
	});
});

// Delete all address of user when that user is deleted
exports.deleteAddresses = catchAsync(async (req, res, next) => {
	const { userId } = req.params;

	await Address.deleteMany({ user: userId });

	res.status(204).json({
		status: 'success',
		data: null,
	});
});
