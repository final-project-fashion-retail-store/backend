const mongoose = require('mongoose');
const { Schema } = mongoose;

const wishlistSchema = new Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: [true, 'Wishlist must belong to a user'],
		},
		product: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Product',
			required: [true, 'Wishlist must have a product'],
		},
	},
	{
		timestamps: true,
	}
);

wishlistSchema.pre(/^find/, function () {
	this.populate({
		path: 'product',
		select: '-__v',
		match: { active: { $ne: false } },
	});
});

wishlistSchema.post(/^find/, function (docs) {
	if (Array.isArray(docs)) {
		// For find operations that return arrays
		return docs.filter((doc) => doc.product !== null);
	} else if (docs && docs.product === null) {
		// For findOne operations
		return null;
	}
});

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

module.exports = Wishlist;
