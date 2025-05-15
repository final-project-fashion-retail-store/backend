const jwt = require('jsonwebtoken');
const client = require('../utils/redis');

const jwtManager = {
	signAccessToken: (id) =>
		jwt.sign({ id }, process.env.JWT_ACCESS_SECRET, {
			expiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
		}),

	signRefreshToken: (id) =>
		jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
			expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
		}),

	// Save refresh token to redis
	setRefreshToken: async (userId, refreshToken) => {
		await client.set(`whitelist:${userId}`, refreshToken, {
			EX: process.env.JWT_COOKIE_REFRESH_EXPIRES_IN * 24 * 60 * 60,
		});
		const result = await client.get(`whitelist:${userId}`);

		if (!result) {
			throw new Error('Failed to set refresh token in redis');
		}
		return result;
	},

	setRefreshTokenToBlacklist: async (refreshToken, expTimestamp) => {
		const currentTimeInSeconds = Math.floor(Date.now() / 1000);
		const secondsUntilExpiry = expTimestamp - currentTimeInSeconds;
		if (secondsUntilExpiry <= 0) {
			return 'Token has expired';
		}

		await client.set(`blacklist:${refreshToken}`, 'blacklisted', {
			EX: secondsUntilExpiry,
		});
		const isBlacklisted = await client.exists(`blacklist:${refreshToken}`);

		if (!isBlacklisted) {
			throw new Error('Failed to set refresh token in redis');
		}
		return isBlacklisted;
	},
};

module.exports = jwtManager;
