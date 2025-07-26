const mongoose = require('mongoose');
const Product = require('./productModel');

const reviewSchema = new mongoose.Schema(
	{
		product: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Product',
			required: true,
		},
		variantId: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
		},
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		rating: {
			type: Number,
			required: true,
			min: 1,
			max: 5,
		},
		title: {
			type: String,
			trim: true,
			maxlength: 100,
		},
		comment: {
			type: String,
			trim: true,
			maxlength: 500,
		},
		images: [
			{
				url: {
					type: String,
					trim: true,
				},
				publicId: {
					type: String,
					trim: true,
				},
			},
			{ _id: false },
		],
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

reviewSchema.statics.calcAverageRatings = async function (productId) {
	const stats = await this.aggregate([
		{
			$match: { product: productId },
		},
		{
			$group: {
				_id: '$product',
				nRating: { $sum: 1 },
				avgRating: { $avg: '$rating' },
			},
		},
	]);

	// update the product document with new calculated values (ratingsQuantity and ratingsAverage)
	if (stats.length > 0) {
		await Product.findByIdAndUpdate(productId, {
			totalReviews: stats[0].nRating,
			averageRating: stats[0].avgRating,
		});
	} else {
		await Product.findByIdAndUpdate(productId, {
			totalReviews: 0,
			averageRating: 0,
		});
	}
};

reviewSchema.virtual('color').get(function () {
	const color = this.product.variants.find(
		(v) => v._id.toString() === this.variantId.toString()
	).color;
	return color;
});

reviewSchema.virtual('size').get(function () {
	const size = this.product.variants.find(
		(v) => v._id.toString() === this.variantId.toString()
	).size;
	return size;
});

reviewSchema.post('save', function () {
	// this points to current review - this.constructor points to the model that created the document (Review)
	this.constructor.calcAverageRatings(this.product);
});

// handle updating and deleting reviews
reviewSchema.pre(/^findOneAnd/, async function () {
	// this points to the query object
	this.review = await this.model.findOne(this.getQuery());
});

// call calcAverageRatings after updating or deleting a review
reviewSchema.post(/^findOneAnd/, async function () {
	await this.review.constructor.calcAverageRatings(this.review.product);
});

module.exports = mongoose.model('Review', reviewSchema);
