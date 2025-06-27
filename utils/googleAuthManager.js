exports.getTokens = async (code) => {
	try {
		const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams({
				client_id: process.env.GOOGLE_CLIENT_ID,
				client_secret: process.env.GOOGLE_CLIENT_SECRET,
				code,
				grant_type: 'authorization_code',
				redirect_uri: `${process.env.BASE_URL}/api/v1/auth/google/callback`,
			}),
		});

		if (!tokenResponse.ok) {
			throw new Error('Failed to exchange code for tokens');
		}

		const tokens = await tokenResponse.json();
		return tokens;
	} catch (err) {
		throw new Error(`Error in getTokens: ${err.message}`);
	}
};

exports.getUserInfo = async (accessToken) => {
	try {
		const userResponse = await fetch(
			'https://www.googleapis.com/oauth2/v2/userinfo',
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			}
		);

		if (!userResponse.ok) {
			throw new Error('Failed to fetch user info');
		}

		const userData = await userResponse.json();
		return userData;
	} catch (err) {
		throw new Error(`Error in getUserInfo: ${err.message}`);
	}
};
