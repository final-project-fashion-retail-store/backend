// middleware/imageMiddleware.js
const cloudinary = require('../utils/cloudinary');
const { formatBufferToDataUri } = require('./upload');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Upload Images Middleware (adjusted for multiple files)
const uploadImages = catchAsync(async (req, res, next) => {
	// Check if there are any files uploaded
	if (!req.files || req.files.length === 0) {
		return next(new AppError('No image uploaded'));
	}

	const uploadedImageDetails = [];

	// Use Promise.all to concurrently upload all files to Cloudinary
	await Promise.all(
		req.files.map(async (file) => {
			const fileDataUri = formatBufferToDataUri(file);
			const result = await cloudinary.uploader.upload(fileDataUri.content);
			uploadedImageDetails.push({
				public_id: result.public_id,
				secure_url: result.secure_url,
			});
		})
	);

	// Attach the array of public_id and secure_url to the request object
	req.cloudinary = {
		uploaded: uploadedImageDetails,
	};
	next();
});

// Destroy Image Middleware (remains the same)
const destroyImage = catchAsync(async (req, res, next) => {
	const { publicId } = req.body;

	if (publicId.length === 0) {
		next(new AppError('Public ID is required for image destruction', 400));
	}

	await Promise.all(
		publicId.map(async (id) => {
			await cloudinary.uploader.destroy(id);
		})
	);

	req.cloudinary = {
		message: 'Image destroyed successfully',
	};
	next();
});

module.exports = { uploadImages, destroyImage };
