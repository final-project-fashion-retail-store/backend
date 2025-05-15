const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getCurrentUser = catchAsync(async (req, res, next) => {
	const user = await User.findById(req.user.id).select(
		'-password -__v -refreshToken -createdAt -updatedAt'
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
