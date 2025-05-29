const APIFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.deleteOne = (Model) =>
	catchAsync(async (req, res, next) => {
		const doc = await Model.findByIdAndDelete(req.params.id);

		if (!doc)
			return next(
				new AppError(`No matching document with the id {${req.params.id}}`, 404)
			);

		res.status(204).json({
			status: 'success',
			data: null,
		});
	});

exports.updateOne = (Model) =>
	catchAsync(async (req, res, next) => {
		const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
			new: true,
			runValidators: true,
			showInactive: true,
		});

		if (!doc)
			return next(
				new AppError(`No matching document with the id {${req.params.id}}`, 404)
			);

		res.status(200).json({
			status: 'success',
			data: {
				data: doc,
			},
		});
	});

exports.createOne = (Model, ...options) =>
	catchAsync(async (req, res, next) => {
		const data = { ...req.body };
		const [checkParentId, modelType] = options;

		if (checkParentId) {
			if (req.body.user !== req.user.id && !['admin'].includes(req.user.role)) {
				return next(new AppError('No permission', 403));
			}
		}

		// Check if user, add password and confirm password field
		if (modelType === 'User') {
			data.password = 'User1234';
			data.passwordConfirm = 'User1234';
		}

		const doc = await Model.create(data);

		// Convert to object and remove unwanted fields
		const { __v, createdAt, updatedAt, ...cleanDoc } = doc.toObject();
		res.status(201).json({
			status: 'success',
			data: {
				data: cleanDoc,
			},
		});
	});

exports.getOne = (Model, populateOptions) =>
	catchAsync(async (req, res, next) => {
		let query = Model.findById(req.params.id);
		if (populateOptions) query = query.populate(populateOptions);
		const doc = await query;

		if (!doc)
			return next(
				new AppError(`No matching document with the id {${req.params.id}}`, 404)
			);

		res.status(200).json({
			status: 'success',
			data: {
				data: doc,
			},
		});
	});

exports.getAll = (Model, collection) =>
	catchAsync(async (req, res) => {
		// To allow for nested GET reviews on tour (hack)
		let filter = {};
		// if (req.params.id) filter.tour = req.params.tourId;

		const features = new APIFeatures(
			Model.find(filter).setOptions({ showInactive: true }),
			req.query
		)
			.filter()
			.sort()
			.limitFields();
		const paginateObj = await features.paginate();
		const doc = await features.query;

		res.status(200).json({
			status: 'success',
			results: doc.length,
			data: {
				data: doc,
				pagination: {
					...paginateObj,
					nextPage: paginateObj.nextPage
						? `${process.env.BASE_URL}/api/v1/${collection}${paginateObj.nextPage}`
						: null,
					prevPage: paginateObj.prevPage
						? `${process.env.BASE_URL}/api/v1/${collection}${paginateObj.prevPage}`
						: null,
				},
			},
		});
	});
