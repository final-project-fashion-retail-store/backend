const forgotPasswordText = (firstName, resetUrl, expiryTime) => {
	return `Hello ${firstName},

We received a request to reset your password for your PurpleBee Fashion account.

To reset your password, please visit the link below:
${resetUrl}

This link will expire at ${expiryTime} (valid for ${10} minutes).

If you didn't request a password reset, please contact our support team immediately at support@purplebee.store.

Thank you for shopping with PurpleBee Fashion!

Best regards,
The PurpleBee Fashion Team

© ${new Date().getFullYear()} PurpleBee Fashion. All rights reserved.
This is an automated message, please do not reply to this email.

Privacy Policy: https://www.purplebee.store/privacy
Contact Us: https://www.purplebee.store/contact`;
};

module.exports = forgotPasswordText;
