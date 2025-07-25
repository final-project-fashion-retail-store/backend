const AppError = require('../utils/appError');

const apiKeyAuth = (req, res, next) => {
	// Skip API key check for Google OAuth callback
	if (
		req.path === '/api/v1/auth/google/callback' ||
		req.path === '/api/v1/orders/webhook'
	) {
		return next();
	}

	const apiKey = req.headers['x-api-key'];

	// Check if API key exists
	if (!apiKey) {
		return next(new AppError('API key is required', 401));
	}

	// Validate the API key against your stored API key
	if (apiKey !== process.env.X_API_KEY) {
		return next(new AppError('Invalid API key', 401));
	}

	// API key is valid, proceed
	next();
};

module.exports = apiKeyAuth;
