const mongoose = require('mongoose');
const { Schema } = mongoose;

const cartItemSchema = new Schema(
	{
		product: {
			type: Schema.Types.ObjectId,
			ref: 'Product',
			required: true,
		},
		variantId: {
			type: Schema.Types.ObjectId,
			required: true,
		},
		quantity: {
			type: Number,
			required: true,
			min: 1,
		},
	},
	{ _id: false }
);

const cartSchema = new Schema(
	{
		user: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			unique: true,
		},
		items: [cartItemSchema],
	},
	{ timestamps: true }
);

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;
