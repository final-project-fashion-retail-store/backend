const mongoose = require('mongoose');
const { Schema } = mongoose;

const addressSchema = new Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: [true, 'Address must belong to a user'],
		},
		fullName: {
			type: String,
			required: [true, 'Address must have a full name'],
			trim: true,
		},
		phoneNumber: {
			type: String,
			required: [true, 'Address must have a phone number'],
			validate: {
				validator: function (val) {
					return /^\d{10}$/.test(val);
				},
				message: 'Phone number must be 10 digits long',
			},
		},
		addressLine: {
			type: String,
			required: [true, 'Address must have a street/building information'],
			trim: true,
			description: 'Street, house number, building, apartment, etc.',
		},
		city: {
			type: String,
			required: [true, 'Address must have a city'],
			trim: true,
		},
		district: {
			type: String,
			required: [true, 'Address must have a district'],
			trim: true,
		},
		ward: {
			type: String,
			required: [true, 'Address must have a ward'],
			trim: true,
		},
		isDefault: {
			type: Boolean,
			default: false,
		},
		label: {
			type: String,
			enum: ['Home', 'Work', 'Other'],
			default: 'Home',
		},
		active: {
			type: Boolean,
			default: true,
		},
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

addressSchema.virtual('formattedAddress').get(function () {
	return `${this.addressLine}, ${this.ward}, ${this.district}, ${this.city}`;
});

addressSchema.pre(/^find/, function (next) {
	if (this.getOptions().showInactive !== true) {
		this.find({ active: { $ne: false } });
	}
	next();
});

// Ensure only one default address per user
addressSchema.pre('save', async function (next) {
	if (this.isDefault) {
		await this.constructor.updateMany(
			{ user: this.user, _id: { $ne: this._id } },
			{ $set: { isDefault: false } }
		);
	}
	next();
});

// Ensure only one default address per user (for update operations)
addressSchema.pre(
	['findOneAndUpdate', 'findByIdAndUpdate'],
	async function (next) {
		const update = this.getUpdate();

		// Check if isDefault is being set to true
		if (
			update &&
			(update.isDefault === true || update.$set?.isDefault === true)
		) {
			// Get the document being updated to find the user
			const docToUpdate = await this.model.findOne(this.getQuery());

			if (docToUpdate) {
				// Set all other addresses of this user to not default
				await this.model.updateMany(
					{ user: docToUpdate.user, _id: { $ne: docToUpdate._id } },
					{ $set: { isDefault: false } }
				);
			}
		}

		next();
	}
);

const Address = mongoose.model('Address', addressSchema);
module.exports = Address;
