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
			required: function () {
				// Password is only required for non-OAuth users
				return !this.googleId;
			},
			minlength: 6,
			select: false,
		},
		passwordConfirm: {
			type: String,
			required: function () {
				// Password confirm is only required when password is being set
				return this.password && this.isModified('password');
			},
			validate: {
				validator: function (val) {
					return val === this.password;
				},
				message: 'Passwords are not the same!',
			},
		},
		googleId: {
			type: String,
			sparse: true, // Allows multiple null values but unique non-null values
		},
		authProvider: {
			type: String,
			enum: ['local', 'google'],
			default: 'local',
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
			trim: true,
		},
		passwordChangedAt: Date,
		passwordResetToken: String,
		passwordResetExpires: Date,
		active: {
			type: Boolean,
			default: true,
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

userSchema.index({ email: 1, authProvider: 1 });

userSchema.virtual('fullName').get(function () {
	return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual('addresses', {
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
		path: 'addresses',
		select: '-__v -active',
		options: { sort: { isDefault: -1 } },
	});
});

userSchema.pre('save', async function (next) {
	// only run this function if password was actually modified
	if (!this.isModified('password')) return next();

	// Skip password hashing for OAuth users
	if (this.authProvider === 'google' && !this.password) {
		return next();
	}

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
