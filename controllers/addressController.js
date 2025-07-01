const User = require('../models/userModel');
const Address = require('../models/addressModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const handlerFactory = require('./handlerFactory');
const APIFeatures = require('../utils/apiFeatures');

/*
Upcoming middleware for customer: create new address, edit address, delete address (deactivate)
*/
exports.createNewAddress = catchAsync(async (req, res, next) => {
	const data = { ...req.body };
	// check if this is the first address, if so, set it as default
	if (!data.isDefault) {
		const existingAddresses = await Address.find({ user: req.user.id });
		if (existingAddresses.length === 0) {
			data.isDefault = true;
		}
	}

	// Create new address
	const address = await Address.create({
		...data,
		user: req.user.id,
	});

	res.status(201).json({
		status: 'success',
		data: {
			address,
		},
	});
});

exports.updateAddressCustomer = catchAsync(async (req, res, next) => {
	const invalidFields = ['user', 'active'];
	if (invalidFields.some((field) => field in req.body)) {
		return next(
			new AppError(`Cannot update fields: ${invalidFields.join(', ')}`, 400)
		);
	}

	const address = await Address.findById(req.params.id);

	if (!address) {
		return next(new AppError('Address does not exist', 404));
	}

	const data = { ...req.body };
	if (!data.isDefault) {
		if (address.isDefault) {
			return next(new AppError('Cannot set default address to not default', 400));
		}
	}

	// Check if user own the address
	if (address.user.toString() !== req.user.id) {
		return next(new AppError('You do not own this address', 403));
	}

	const updatedAddress = await Address.findByIdAndUpdate(req.params.id, data, {
		new: true,
		runValidators: true,
		showInactive: true,
	});

	res.status(200).json({
		status: 'success',
		data: {
			address: updatedAddress,
		},
	});
});

// get all addresses of a customer
exports.getAllUserAddresses = catchAsync(async (req, res) => {
	let query = Address.find({ user: req.user.id });

	// Apply API features
	const features = new APIFeatures(query, req.query)
		.filter()
		.sort()
		.limitFields();

	// Get pagination info
	const paginationInfo = await features.paginate();

	// Execute the query
	const addresses = await features.query;

	res.status(200).json({
		status: 'success',
		results: addresses.length,
		data: {
			addresses,
			pagination: {
				...paginationInfo,
				nextPage: paginationInfo.nextPage
					? `${process.env.BASE_URL}/api/v1/${collection}${paginationInfo.nextPage}`
					: null,
				prevPage: paginationInfo.prevPage
					? `${process.env.BASE_URL}/api/v1/${collection}${paginationInfo.prevPage}`
					: null,
			},
		},
	});
});

// Customer can delete their address
exports.deactivateAddress = catchAsync(async (req, res, next) => {
	const address = await Address.findById(req.params.id);
	const userAddresses = await Address.find({ user: req.user.id });
	if (!address) {
		return next(new AppError('Address does not exist', 404));
	}

	if (address.user.toString() !== req.user.id) {
		return next(new AppError('You do not own this address', 403));
	}

	if (address.isDefault && userAddresses.length > 1) {
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
exports.updateAddress = catchAsync(async (req, res, next) => {
	const data = { ...req.body };
	// get user id from email request data
	if (data.email) {
		const user = await User.findOne({ email: data.email });
		if (!user) {
			return next(new AppError('User does not exist', 404));
		}

		//don't allow set the default address to not default
		if (!data.isDefault) {
			const address = await Address.findById(req.params.id);
			console.log(address);
			if (address.isDefault) {
				return next(new AppError('Cannot set default address to not default', 400));
			}
		}

		data.user = user.id;
		delete data.email;
	}

	const address = await Address.findByIdAndUpdate(req.params.id, data, {
		new: true,
		runValidators: true,
		showInactive: true,
	});

	res.status(200).json({
		status: 'success',
		data: {
			address,
		},
	});
});

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

	// get user id by the email from request input
	const user = await User.findOne({ email: data.email });
	if (!user) {
		return next(new AppError('User does not exist', 404));
	}

	const addresses = await Address.find({ user: user.id });
	if (addresses.length === 0) {
		data.isDefault = true;
	}

	// Remove exclude field and add suitable field
	delete data.email;
	data.user = user.id;

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
