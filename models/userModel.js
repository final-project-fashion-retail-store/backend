// const crypto = require("node:crypto");
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const { Schema } = mongoose;

const userSchema = new Schema(
	{
		email: {
			type: String,
			required: [true, 'Please provide your email'],
			unique: true,
			lowercase: true,
			validate: {
				validator: function (val) {
					return validator.isEmail(val);
				},
				message: 'Please provide a valid email address',
			},
		},
		password: {
			type: String,
			required: [true, 'Please provide a password'],
			minlength: 6,
			select: false,
		},
		passwordConfirm: {
			type: String,
			required: [true, 'Please confirm your password'],
			validate: {
				// This only works on CREATE and SAVE!!!
				validator: function (val) {
					return val === this.password;
				},
				message: 'Passwords are not the same!',
			},
		},
		role: {
			type: String,
			enum: ['user', 'admin', 'staff'],
			default: 'user',
		},
		firstName: {
			type: String,
			required: [true, 'Please provide your first name'],
			trim: true,
		},
		lastName: {
			type: String,
			required: [true, 'Please provide your last name'],
			trim: true,
		},
		avatar: {
			type: String,
			default: 'default.jpg',
		},
		phoneNumber: {
			type: String,
			default: '',
			// validate: {
			// 	validator: function (val) {
			// 		return validator.isMobilePhone(val, 'vi-VN', { strictMode: false });
			// 	},
			// 	message: 'Please provide a valid phone number',
			// },
		},
		addresses: {
			default: [],
			type: [
				{
					type: String,
					isDefault: Boolean,
					trim: true,
				},
			],
		},
		passwordChangedAt: Date,
		lastLogin: Date,
	},
	{
		timestamps: true,
		toJSON: {
			virtuals: true,
			transform: function (doc, ret) {
				delete ret.id;
				return ret;
			},
		},
		toObject: {
			virtuals: true,
			transform: function (doc, ret) {
				delete ret.id;
				return ret;
			},
		},
	}
);

userSchema.virtual('fullName').get(function () {
	return `${this.firstName} ${this.lastName}`;
});

userSchema.pre('save', async function (next) {
	// only run this function if password was actually modified
	if (!this.isModified('password')) return next();

	// hash the password with cost of 12
	const salt = await bcrypt.genSalt(12);
	this.password = await bcrypt.hash(this.password, salt);

	// delete passwordConfirm field
	this.passwordConfirm = undefined;
	next();
});

userSchema.method({
	async correctPassword(candidatePassword, userPassword) {
		return await bcrypt.compare(candidatePassword, userPassword);
	},
	changedPasswordAfter(JWTTimestamp) {
		if (this.passwordChangedAt) {
			const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000);

			return JWTTimestamp < changedTimestamp;
		}

		return false;
	},
});

const User = mongoose.model('User', userSchema);
module.exports = User;
