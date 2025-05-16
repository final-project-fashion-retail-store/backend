const nodemailer = require('nodemailer');

const welcomeHtml = require('../Templates/welcomeHtml');
const welcomeText = require('../Templates/welcomeText');
const passwordResetHtml = require('../Templates/forgotPasswordHtml');
const passwordResetText = require('../Templates/forgotPasswordText');

module.exports = class Email {
	constructor(user, url) {
		this.to = user.email;
		this.firstName = user.firstName;
		this.url = url;
		this.from = '"PurpleBee Fashion" <noreply@purplebeefashion.com>';
	}

	newTransport() {
		if (process.env.NODE_ENV === 'production') {
			// Sendgrid
			return nodemailer.createTransport({
				host: 'smtp.sendgrid.net',
				port: 587,
				secure: false,
				auth: {
					user: process.env.SENDGRID_USERNAME,
					pass: process.env.SENDGRID_API_KEY,
				},
			});
		}

		return nodemailer.createTransport({
			host: process.env.MAILTRAP_HOST,
			port: process.env.MAILTRAP_PORT,
			auth: {
				user: process.env.MAILTRAP_USERNAME,
				pass: process.env.MAILTRAP_PASSWORD,
			},
		});
	}

	// Send the actual email
	async send(mailType, subject, ...args) {
		const [passwordResetExpires] = args;
		let html, text;

		if (mailType === 'welcome') {
			html = welcomeHtml(this.firstName, this.to);
			text = welcomeText(this.firstName, this.to);
		} else if (mailType === 'passwordReset') {
			const passwordExpireTime = passwordResetExpires.toLocaleTimeString('en-US', {
				hour: '2-digit',
				minute: '2-digit',
			});
			html = passwordResetHtml(this.firstName, this.url, passwordExpireTime);
			text = passwordResetText(this.firstName, this.url, passwordExpireTime);
		}

		// Define the email options
		const mailOptions = {
			from: this.from,
			to: this.to,
			subject,
			html,
			text,
		};

		// Create a transport and send email
		await this.newTransport().sendMail(mailOptions);
	}

	async sendWelcome() {
		await this.send('welcome', 'Welcome to PurpleBee Fashion! 💜');
	}

	async sendPasswordReset(passwordResetExpires) {
		await this.send(
			'passwordReset',
			'Reset Your PurpleBee Fashion Password',
			passwordResetExpires
		);
	}
};
