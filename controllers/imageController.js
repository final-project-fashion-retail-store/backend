const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.uploadImage = catchAsync(async (req, res, next) => {
	const uploaded = req.cloudinary?.uploaded;
	if (!uploaded || uploaded.length === 0) {
		return next(new AppError('No image uploaded', 400));
	}

	let data;

	if (uploaded.length === 1) {
		data = {
			image: {
				public_id: uploaded[0].public_id,
				secure_url: uploaded[0].secure_url,
			},
		};
	} else if (uploaded.length > 1) {
		data = {
			images: uploaded,
		};
	}

	res.status(200).json({
		status: 'success',
		data,
	});
});

exports.destroyImage = catchAsync(async (req, res, next) => {
	const { cloudinary } = req;

	res.status(200).json({
		status: 'success',
		data: {
			message: cloudinary.message,
		},
	});
});
