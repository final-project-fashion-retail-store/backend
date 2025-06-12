// models/Subcategory.js
const mongoose = require('mongoose');
const slugify = require('slugify');
const { Schema } = mongoose;

const subcategorySchema = new Schema(
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
		parentCategory: {
			type: Schema.Types.ObjectId,
			ref: 'Category',
			required: true,
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

subcategorySchema.index({ parentCategory: 1, active: 1 });

subcategorySchema.pre('save', function () {
	this.slug = slugify(this.name, { lower: true });
});

const Subcategory = mongoose.model('Subcategory', subcategorySchema);
module.exports = Subcategory;
