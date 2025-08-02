const nodemailer = require('nodemailer');

const welcomeHtml = require('../Templates/welcomeHtml');
const welcomeText = require('../Templates/welcomeText');
const passwordResetHtml = require('../Templates/forgotPasswordHtml');
const passwordResetText = require('../Templates/forgotPasswordText');
const orderPlacedHtml = require('../Templates/orderPlacedHtml');
const orderPlacedText = require('../Templates/orderPlacedText');

module.exports = class Email {
	constructor(user, url) {
		this.to = user.email;
		this.firstName = user.firstName;
		this.url = url;
		this.from = '"Purplebee" <noreply@purplebee.store>';
	}

	newTransport() {
		if (process.env.NODE_ENV === 'production') {
			// SES
			return nodemailer.createTransport({
				host: 'smtp.resend.com',
				port: 587,
				secure: false,
				auth: {
					user: process.env.SMTP_USERNAME,
					pass: process.env.SMTP_PASSWORD,
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
	async send(mailType, subject, data = {}) {
		let html, text;

		switch (mailType) {
			case 'welcome':
				({ html, text } = this.getWelcomeContent());
				break;
			case 'passwordReset':
				({ html, text } = this.getPasswordResetContent(data.passwordResetExpires));
				break;
			case 'orderPlaced':
				({ html, text } = this.getOrderPlacedContent(data.order));
				break;
			default:
				throw new Error(`Unknown mail type: ${mailType}`);
		}

		const mailOptions = {
			from: this.from,
			to: this.to,
			subject,
			html,
			text,
		};

		await this.newTransport().sendMail(mailOptions);
	}

	getWelcomeContent() {
		return {
			html: welcomeHtml(this.firstName, this.to),
			text: welcomeText(this.firstName, this.to),
		};
	}

	getPasswordResetContent(passwordResetExpires) {
		const passwordExpireTime = passwordResetExpires.toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
		});
		return {
			html: passwordResetHtml(this.firstName, this.url, passwordExpireTime),
			text: passwordResetText(this.firstName, this.url, passwordExpireTime),
		};
	}

	getOrderPlacedContent(order) {
		return {
			html: orderPlacedHtml(this.firstName, this.email, order),
			text: orderPlacedText(this.firstName, this.email, order),
		};
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

	async sendOrderPlaced(order) {
		await this.send('orderPlaced', 'Your Order Has Been Placed!', order);
	}
};
