const mongoose = require('mongoose');
const slugify = require('slugify');
const { Schema } = mongoose;

const brandSchema = new Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
		},
		slug: {
			type: String,
			unique: true,
			trim: true,
		},
		logo: {
			public_id: {
				type: String,
				default: '',
			},
			url: {
				type: String,
				default: '',
			},
		},
		featuredBrand: {
			type: Boolean,
			default: false,
		},
		productNum: {
			type: Number,
			default: 0,
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

brandSchema.index({ active: 1 });
brandSchema.index({ featuredBrand: 1 });

brandSchema.pre('save', function (next) {
	if (!this.slug || this.isModified('name')) {
		this.slug = slugify(this.name, { lower: true, strict: true });
	}
	next();
});

const Brand = mongoose.model('Brand', brandSchema);
module.exports = Brand;
