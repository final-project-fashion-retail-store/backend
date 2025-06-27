const mongoose = require('mongoose');
const slugify = require('slugify');
const { Schema } = mongoose;

const categorySchema = new Schema(
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

categorySchema.index({ active: 1 });

categorySchema.virtual('subcategories', {
	ref: 'Subcategory',
	foreignField: 'parentCategory',
	localField: '_id',
});

categorySchema.pre('save', function () {
	this.slug = slugify(this.name, { lower: true });
});

// categorySchema.pre(/^find/, function () {
// 	this.populate({
// 		path: 'subCategories',
// 		select: '-__v -active',
// 	});
// });

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
