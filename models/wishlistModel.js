const mongoose = require('mongoose');
const { Schema } = mongoose;

const wishlistSchema = new Schema({
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: [true, 'Wishlist must belong to a user'],
	},
	product: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Product',
		required: [true, 'Wishlist must have a product'],
		// autopopulate: { select: '-__v' },
	},
});

wishlistSchema.pre(/^find/, function () {
	this.populate({
		path: 'product',
		select: '-__v',
	});
});

// wishlistSchema.plugin(require('mongoose-autopopulate'));

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

module.exports = Wishlist;
