const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const crypto = require('node:crypto');

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
const { getTokens, getUserInfo } = require('../utils/googleAuthManager');
const Email = require('../utils/mail');

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
		sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
	});

	res.cookie('refreshToken', result, {
		expires: new Date(
			Date.now() + process.env.JWT_COOKIE_REFRESH_EXPIRES_IN * 24 * 60 * 60 * 1000
		),
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
	});

	// Send response
	const userObj = user.toObject();
	delete userObj.password;
	delete userObj.__v;
	delete userObj.updatedAt;

	res.status(statusCode).json({
		status: 'success',
		data: {
			user: userObj,
		},
	});
};

// Google OAuth login
exports.googleCallback = catchAsync(async (req, res) => {
	const { code, error } = req.query;

	// Handle OAuth errors
	if (error) {
		if (error === 'access_denied') {
			return res.redirect(`${process.env.FRONTEND_URL}/?error=cancelled`);
		} else {
			return res.redirect(`${process.env.FRONTEND_URL}/?error=oauth_failed`);
		}
	}

	// Handle missing authorization code
	if (!code) {
		console.error('No authorization code received');
		return res.redirect(`${process.env.FRONTEND_URL}/?error=no_code`);
	}

	try {
		// Exchange the authorization code for tokens
		const tokens = await getTokens(code);

		// Get user info from Google
		const userData = await getUserInfo(tokens.access_token);
		const {
			id: googleId,
			email,
			given_name: firstName,
			family_name: lastName,
			picture: avatarUrl,
			// verified_email: emailVerified,
		} = userData;

		// Check if user exists with this Google ID
		let user = await User.findOne({ googleId });

		if (!user) {
			// Check if user exists with same email but different auth provider
			const existingUser = await User.findOne({ email, authProvider: 'local' });

			if (existingUser) {
				// Suppose to combine local account with Google account here, but not implemented
				return res.redirect(`${process.env.FRONTEND_URL}/?error=account_exists`);
			} else {
				// Create new user
				user = await User.create({
					email,
					firstName,
					lastName: lastName || 'User',
					googleId,
					authProvider: 'google',
					// emailVerified: emailVerified || false,
					avatar: {
						url: avatarUrl || '',
					},
				});
				// Send welcome email
				const url = `${req.protocol}://${req.get('host')}`;
				await new Email(user, url).sendWelcome();
			}
		}

		// check if user is already had a refresh token in redis, set it to blacklist
		const existingRefreshTokenKey = `whitelist:${user.id}`;
		const existingRefreshToken = await client.get(existingRefreshTokenKey);

		if (existingRefreshToken) {
			// Blacklist the existing refresh token
			try {
				const decoded = jwt.decode(existingRefreshToken);
				if (decoded && decoded.exp) {
					await setRefreshTokenToBlacklist(existingRefreshToken, decoded.exp);
				}
			} catch (err) {
				console.log('Error blacklisting existing token during OAuth:', err.message);
			}
		}

		// Generate JWT tokens
		const accessToken = signAccessToken(user.id);
		const refreshToken = signRefreshToken(user.id);

		const result = await setRefreshToken(user.id, refreshToken);
		if (!result) {
			throw new Error('Failed to set refresh token in redis');
		}

		// Set cookies and redirect to frontend with success
		res.cookie('accessToken', accessToken, {
			expires: new Date(
				Date.now() + process.env.JWT_COOKIE_ACCESS_EXPIRES_IN * 24 * 60 * 60 * 1000
			),
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
		});

		res.cookie('refreshToken', result, {
			expires: new Date(
				Date.now() + process.env.JWT_COOKIE_REFRESH_EXPIRES_IN * 24 * 60 * 60 * 1000
			),
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
		});

		// Redirect back to frontend with success
		res.redirect(`${process.env.FRONTEND_URL}/?login=success`);
	} catch (error) {
		console.error('OAuth callback error:', error);
		res.redirect(`${process.env.FRONTEND_URL}/?login=failed`);
	}
});

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
		sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
	});

	// Set new refresh token in cookie
	res.cookie('refreshToken', result, {
		expires: new Date(
			Date.now() + process.env.JWT_COOKIE_REFRESH_EXPIRES_IN * 24 * 60 * 60 * 1000
		),
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
	});
	// 8) Send response to client

	res.status(200).json({
		status: 'success',
		message: 'Access token refreshed successfully',
	});
});

exports.signup = catchAsync(async (req, res, next) => {
	const newUser = await User.create(req.body);

	// Send welcome email
	const url = `${req.protocol}://${req.get('host')}`;
	await new Email(newUser, url).getWelcomeContent();

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

	if (!user) {
		return next(
			new AppError(
				'Your account is blocked or email does not exist. Please try again.',
				401
			)
		);
	}

	// Check if user is blocked
	// if (!user.active) {
	// 	return next(
	// 		new AppError('Your account is blocked. Please contact support.', 403)
	// 	);
	// }

	// Check if user is trying to login with password but account is OAuth only
	if (user.authProvider === 'google' && !user.password) {
		return next(
			new AppError(
				'This account was created with Google. Please use Google Sign-In.',
				401
			)
		);
	}

	if (!user || !correct)
		return next(new AppError('Incorrect email or password', 401));

	if (refreshToken) {
		try {
			const decoded = await promisify(jwt.verify)(
				refreshToken,
				process.env.JWT_REFRESH_SECRET
			);
			const result = await setRefreshTokenToBlacklist(refreshToken, decoded.exp);
			if (!result) {
				return next(new AppError('Failed to set refresh token in redis', 500));
			}
		} catch (err) {
			next(err);
		}
	}

	// 3) Everything is valid, send token to client
	createSendToken(user, 200, res, next);
});

exports.logout = catchAsync(async (req, res, next) => {
	// Get refresh token from cookie
	const refreshToken = req.cookies.refreshToken;

	try {
		// set old refresh token to blacklist
		const decoded = await promisify(jwt.verify)(
			refreshToken,
			process.env.JWT_REFRESH_SECRET
		);
		const result = await setRefreshTokenToBlacklist(refreshToken, decoded.exp);
		if (!result) {
			return next(new AppError('Failed to set refresh token in redis', 500));
		}
	} catch (err) {
		next(err);
	}

	const isProduction = process.env.NODE_ENV === 'production';
	res.clearCookie('accessToken', {
		httpOnly: true,
		secure: isProduction,
		sameSite: isProduction ? 'none' : 'strict',
	});

	res.clearCookie('refreshToken', {
		httpOnly: true,
		secure: isProduction,
		sameSite: isProduction ? 'none' : 'strict',
	});

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
	let decoded;
	try {
		decoded = await promisify(jwt.verify)(token, process.env.JWT_ACCESS_SECRET);
	} catch (err) {
		console.log('JWT Error:', err.name, err.message);
		// Pass JWT errors directly to the error handler
		return next(err);
	}

	// Checking existence of user
	const currentUser = await User.findById(decoded.id);
	if (!currentUser)
		return next(
			new AppError(
				'Your account is blocked or email does not exist. Please try again.',
				401
			)
		);

	// Checking if account is blocked
	// if (!currentUser.active) {
	// 	return next(
	// 		new AppError('Your account is blocked. Please contact support.', 403)
	// 	);
	// }

	// Checking if user changed password after token was issued
	if (
		currentUser.authProvider === 'local' &&
		currentUser.changedPasswordAfter(decoded.iat)
	) {
		const refreshToken = req.cookies.refreshToken;

		if (refreshToken) {
			try {
				// set old refresh token to blacklist
				const refreshDecoded = await promisify(jwt.verify)(
					refreshToken,
					process.env.JWT_REFRESH_SECRET
				);
				const result = await setRefreshTokenToBlacklist(
					refreshToken,
					refreshDecoded.exp
				);
				if (!result) {
					return next(new AppError('Failed to set refresh token in redis', 500));
				}
				res.clearCookie('accessToken');
				res.clearCookie('refreshToken');
			} catch (err) {
				console.log('Error blacklisting token after password change:', err.message);
			}
		}

		return next(
			new AppError('Password has been changed. Please login again!', 401)
		);
	}

	// grant access to protected route
	req.user = currentUser;
	next();
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
	// check if user exists
	const user = await User.findOne({ email: req.body.email });
	if (!user) {
		return next(new AppError('There is no user with that email address', 404));
	}

	// Check if user is blocked
	if (!user.active) {
		return next(
			new AppError('Your account is blocked. Please contact support.', 403)
		);
	}

	// Check if user is Google OAuth user
	if (user.authProvider === 'google' && !user.password) {
		return next(
			new AppError(
				'This account was created with Google. Please use Google Sign-In to access your account.',
				400
			)
		);
	}

	// Prevent spamming the reset password email
	const RESEND_COOLDOWN = 5 * 60 * 1000; // 5 minutes in milliseconds

	if (user.passwordResetExpires && user.passwordResetExpires > Date.now()) {
		// Calculate when the token was created (assuming 10 minutes expiry)
		const TOKEN_EXPIRY_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
		const tokenCreatedAt = user.passwordResetExpires - TOKEN_EXPIRY_DURATION;

		if (Date.now() - tokenCreatedAt < RESEND_COOLDOWN) {
			const timeRemaining = Math.ceil(
				(RESEND_COOLDOWN - (Date.now() - tokenCreatedAt)) / 1000 / 60
			);
			return next(
				new AppError(
					`Please wait ${timeRemaining} minutes before requesting another reset email.`,
					429
				)
			);
		}
	}

	// generate reset token
	const resetToken = user.generatePasswordResetToken();
	await user.save({ validateBeforeSave: false });

	// 3) Send it to user's email
	// This is temporary, we will change the url to the frontend url later
	const frontendURL = req.get('origin') || req.get('referer');
	const resetURL = `${frontendURL}/reset-password/${resetToken}`;

	try {
		await new Email(user, resetURL).getPasswordResetContent(
			user.passwordResetExpires
		);

		res.status(200).json({
			status: 'success',
			message: 'Reset password URL sent to your email!',
		});
	} catch (err) {
		user.passwordResetToken = undefined;
		user.passwordResetExpires = undefined;
		await user.save({ validateBeforeSave: false });

		return next(
			new AppError('There was an error sending the email. Try again later!', 500)
		);
	}
});

exports.resetPassword = catchAsync(async (req, res, next) => {
	// Get user based on token
	const hashedToken = crypto
		.createHash('sha256')
		.update(req.params.token)
		.digest('hex');

	const user = await User.findOne({
		passwordResetToken: hashedToken,
		passwordResetExpires: { $gt: Date.now() },
	});

	if (!user) return next(new AppError('Token is invalid or expired', 400));

	// Set new password
	user.password = req.body.password;
	user.passwordConfirm = req.body.passwordConfirm;
	user.passwordResetToken = undefined;
	user.passwordResetExpires = undefined;
	await user.save();

	// Update changing password timestamp for user
	// Send message to user
	res.status(200).json({
		status: 'success',
		message: 'Password reset successful!',
	});
});

exports.updatePassword = catchAsync(async (req, res, next) => {
	// Get user from collection
	const currentUser = await User.findById(req.user.id).select('+password');

	// Check if user is Google OAuth user
	if (currentUser.authProvider === 'google' && !currentUser.password) {
		return next(
			new AppError(
				'Cannot update password for Google OAuth account. Please use Google to manage your account.',
				400
			)
		);
	}

	// Check data
	for (const key in req.body) {
		const validFields = ['oldPassword', 'newPassword', 'passwordConfirm'];
		if (!validFields.includes(key)) {
			return next(new AppError('Invalid field in request body', 400));
		}
	}

	// Check the correctness of current password
	const correct = await currentUser.correctPassword(
		req.body.oldPassword,
		currentUser.password
	);

	if (!correct) return next(new AppError('Incorrect current password', 401));

	// Update password
	currentUser.password = req.body.newPassword;
	currentUser.passwordConfirm = req.body.passwordConfirm;
	await currentUser.save();

	res.status(200).json({
		status: 'success',
		message: 'Password updated successfully!',
	});
});

exports.restrictTo = (...roles) => {
	return (req, res, next) => {
		if (!roles.includes(req.user.role))
			return next(new AppError('No permission to do the action!', 403));

		next();
	};
};
