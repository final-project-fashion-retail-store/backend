// const crypto = require("node:crypto");
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const { maxHeaderSize } = require('node:http');

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
			public_id: {
				type: String,
				default: '',
			},
			url: {
				type: String,
				default: '',
			},
		},
		phoneNumber: {
			type: String,
			default: '',
			maxLength: [10, 'Phone number must be 10 digits long'],
			minLength: [10, 'Phone number must be 10 digits long'],
			trim: true,
		},
		passwordChangedAt: Date,
		passwordResetToken: String,
		passwordResetExpires: Date,
		active: {
			type: Boolean,
			default: true,
			select: false,
		},
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

userSchema.virtual('userAddresses', {
	ref: 'Address',
	foreignField: 'user',
	localField: '_id',
});

userSchema.pre(/^find/, function (next) {
	// Only show active users
	if (this.getOptions().showInactive !== true) {
		this.find({ active: { $ne: false } });
	}
	next();
});

userSchema.pre(/^find/, function () {
	this.populate({
		path: 'userAddresses',
		select: 'addressLine city label isDefault -user',
	});
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

userSchema.pre('save', function (next) {
	if (!this.isModified('password') || this.$isNew) return next();

	this.passwordChangedAt = Date.now();
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
	generatePasswordResetToken() {
		const resetToken = crypto.randomBytes(32).toString('hex');

		this.passwordResetToken = crypto
			.createHash('sha256')
			.update(resetToken)
			.digest('hex');

		this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
		return resetToken;
	},
});

const User = mongoose.model('User', userSchema);
module.exports = User;
