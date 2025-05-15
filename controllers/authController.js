const jwt = require('jsonwebtoken');
const { promisify } = require('util');

const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const client = require('../utils/redis');
const {
	signAccessToken,
	signRefreshToken,
	setRefreshToken,
	setRefreshTokenToBlacklist,
} = require('../utils/jwtManager');

const createSendToken = async (user, statusCode, res, next) => {
	const accessToken = signAccessToken(user.id);
	const refreshToken = signRefreshToken(user.id);

	const result = await setRefreshToken(user.id, refreshToken);
	if (!result) {
		return next(new AppError('Failed to set refresh token in redis', 500));
	}

	// Set cookies
	res.cookie('accessToken', accessToken, {
		expires: new Date(
			Date.now() + process.env.JWT_COOKIE_ACCESS_EXPIRES_IN * 24 * 60 * 60 * 1000
		),
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict',
	});

	res.cookie('refreshToken', result, {
		expires: new Date(
			Date.now() + process.env.JWT_COOKIE_REFRESH_EXPIRES_IN * 24 * 60 * 60 * 1000
		),
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict',
	});

	// Send response
	const userObj = user.toObject();
	delete userObj.password;
	delete userObj.__v;
	delete userObj.createdAt;
	delete userObj.updatedAt;

	res.status(statusCode).json({
		status: 'success',
		data: {
			user: userObj,
		},
	});
};

// New route handler for refreshing tokens
exports.refreshToken = catchAsync(async (req, res, next) => {
	// console.log(req.cookies);
	// 1) Get refresh token from cookie
	let refreshToken;
	refreshToken = req.cookies.refreshToken;

	if (!refreshToken) {
		return next(new AppError('No refresh token found', 401));
	}

	// 2) Verify refresh token
	const decoded = await promisify(jwt.verify)(
		refreshToken,
		process.env.JWT_REFRESH_SECRET
	);

	// 3) Check if refresh token is in blacklist
	const isBlacklisted = await client.exists(`blacklist:${refreshToken}`);
	if (isBlacklisted) {
		return next(new AppError('Token has expired, Please log in again', 401));
	}

	//Check if user still exists
	const user = await User.findById(decoded.id);
	if (!user) {
		return next(new AppError('The user does not exist', 401));
	}

	// Check if user exists in redis
	const redisRefreshToken = await client.get(`whitelist:${user.id}`);
	if (!redisRefreshToken) {
		return next(
			new AppError('Token is invalid or has expired. Please log in again.', 401)
		);
	}

	// 4) Check if refresh token matches the one stored in redis
	if (refreshToken !== redisRefreshToken) {
		return next(new AppError('Invalid refresh token', 401));
	}

	// 5) Generate new access token
	const accessToken = signAccessToken(user.id);
	// 6) Generate new refresh token
	const newRefreshToken = signRefreshToken(user.id);

	// 7) Update refresh token in redis
	const result = await setRefreshToken(user.id, newRefreshToken);
	if (!result) {
		return next(new AppError('Failed to set refresh token in redis', 500));
	}

	// set old refresh token to blacklist
	const blacklistResult = await setRefreshTokenToBlacklist(
		refreshToken,
		decoded.exp
	);

	if (!blacklistResult) {
		return next(new AppError('Failed to set refresh token in redis', 500));
	}

	// Set access token in cookie
	res.cookie('accessToken', accessToken, {
		expires: new Date(
			Date.now() + process.env.JWT_COOKIE_ACCESS_EXPIRES_IN * 24 * 60 * 60 * 1000
		),
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict',
	});

	// Set new refresh token in cookie
	res.cookie('refreshToken', result, {
		expires: new Date(
			Date.now() + process.env.JWT_COOKIE_REFRESH_EXPIRES_IN * 24 * 60 * 60 * 1000
		),
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict',
	});
	// 8) Send response to client

	res.status(200).json({
		status: 'success',
		message: 'Access token refreshed successfully',
	});
});

exports.signup = catchAsync(async (req, res, next) => {
	const newUser = await User.create(req.body);

	createSendToken(newUser, 201, res, next);
});

exports.login = catchAsync(async (req, res, next) => {
	const { email, password } = req.body;
	const { refreshToken } = req.cookies;
	// 1) Check existence of email and password
	if (!email || !password)
		return next(new AppError('Please provide email and password', 400));

	// 2) Check existence of user and correct password
	const user = await User.findOne({ email }).select('+password');
	const correct = await user?.correctPassword(password, user?.password);

	if (!user || !correct)
		return next(new AppError('Incorrect email or password', 401));

	if (refreshToken) {
		// set old refresh token to blacklist
		const decoded = await promisify(jwt.verify)(
			refreshToken,
			process.env.JWT_REFRESH_SECRET
		);

		const result = await setRefreshTokenToBlacklist(refreshToken, decoded.exp);
		if (!result) {
			return next(new AppError('Failed to set refresh token in redis', 500));
		}
	}

	// 3) Everything is valid, send token to client
	createSendToken(user, 200, res, next);
});

exports.logout = catchAsync(async (req, res) => {
	// Get refresh token from cookie
	const refreshToken = req.cookies.refreshToken;

	// set old refresh token to blacklist
	const decoded = await promisify(jwt.verify)(
		refreshToken,
		process.env.JWT_REFRESH_SECRET
	);
	const result = await setRefreshTokenToBlacklist(refreshToken, decoded.exp);
	if (!result) {
		return next(new AppError('Failed to set refresh token in redis', 500));
	}

	res.clearCookie('accessToken');
	res.clearCookie('refreshToken');

	res.status(204).json({
		status: 'success',
		message: 'Logged out successfully',
	});
});

exports.protect = catchAsync(async (req, res, next) => {
	// Checking existence of token
	let token;
	if (
		req.headers.authorization &&
		req.headers.authorization.startsWith('Bearer')
	) {
		token = req.headers.authorization.split(' ')[1];
	} else if (req.cookies.accessToken) token = req.cookies.accessToken;
	if (!token) return next(new AppError('Unauthorized access', 401));

	// Verification of token
	const decoded = await promisify(jwt.verify)(
		token,
		process.env.JWT_ACCESS_SECRET
	);

	// Checking existence of user
	const currentUser = await User.findById(decoded.id);
	if (!currentUser) return next(new AppError('The user does not exist', 401));

	// Checking if user changed password after token was issued
	if (currentUser.changedPasswordAfter(decoded.iat))
		return next(
			new AppError('Password has been changed. Please login again!', 401)
		);

	// grant access to protected route
	req.user = currentUser;
	next();
});
