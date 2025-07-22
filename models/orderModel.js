// models/orderModel.js
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
	{
		productId: {
			type: mongoose.Schema.ObjectId,
			ref: 'Product',
			required: [true, 'Order item must have a product ID'],
		},
		variantId: {
			type: mongoose.Schema.ObjectId,
			ref: 'ProductVariant', // Adjust reference based on your variant model
		},
		quantity: {
			type: Number,
			required: [true, 'Order item must have a quantity'],
			min: [1, 'Quantity must be at least 1'],
		},
		price: {
			type: Number,
			required: [true, 'Order item must have a price'],
			min: [0, 'Price must be positive'],
		},
		importPrice: {
			type: Number,
			required: [true, 'Order item must have an import price'],
			min: [0, 'Import price must be positive'],
		},
		name: {
			type: String,
			required: [true, 'Order item must have a name'],
		},
		image: {
			type: String,
			required: [true, 'Order item must have an image'],
		},
	},
	{ _id: false }
);

const paymentDetailsSchema = new mongoose.Schema(
	{
		transactionId: {
			type: String,
			sparse: true, // Allow null but ensure uniqueness when present
		},
		provider: {
			type: String,
			enum: ['stripe', 'paypal', 'cash_on_delivery'],
			default: 'stripe',
		},
		status: {
			type: String,
			enum: ['pending', 'paid', 'failed', 'refunded'],
			default: 'pending',
		},
	},
	{ _id: false }
);

const orderSchema = new mongoose.Schema(
	{
		orderNumber: {
			type: String,
			unique: true,
			required: [true, 'Order must have an order number'],
		},
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: [true, 'Order must belong to a user'],
		},
		items: {
			type: [orderItemSchema],
			required: [true, 'Order must have items'],
			validate: {
				validator: function (items) {
					return items && items.length > 0;
				},
				message: 'Order must have at least one item',
			},
		},
		shippingAddress: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Address',
			required: [true, 'Order must have a shipping address'],
		},
		billingAddress: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Address',
			required: [true, 'Order must have a billing address'],
		},
		paymentMethod: {
			type: String,
			enum: ['stripe', 'paypal', 'cash_on_delivery'],
			required: [true, 'Order must have a payment method'],
			default: 'stripe',
		},
		paymentDetails: {
			type: paymentDetailsSchema,
			required: true,
			default: () => ({}),
		},
		subtotal: {
			type: Number,
			required: [true, 'Order must have a subtotal'],
			min: [0, 'Subtotal must be positive'],
		},
		shippingCost: {
			type: Number,
			required: [true, 'Order must have a shipping cost'],
			min: [0, 'Shipping cost must be positive'],
			default: 0,
		},
		taxAmount: {
			type: Number,
			required: [true, 'Order must have a tax amount'],
			min: [0, 'Tax amount must be positive'],
			default: 0,
		},
		totalAmount: {
			type: Number,
			required: [true, 'Order must have a total amount'],
			min: [0, 'Total amount must be positive'],
		},
		status: {
			type: String,
			enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
			default: 'pending',
		},
		trackingNumber: {
			type: String,
		},
		notes: {
			type: String,
		},
		createdAt: {
			type: Date,
			default: Date.now,
		},
		updatedAt: {
			type: Date,
			default: Date.now,
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

// Indexes
orderSchema.index({ userId: 1, createdAt: -1 });
// orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1 });
// orderSchema.index({ 'paymentDetails.transactionId': 1 });

// Pre-save middleware to generate order number and update timestamp
orderSchema.pre('save', function (next) {
	// Generate order number if it doesn't exist
	if (!this.orderNumber) {
		const timestamp = Date.now().toString();
		const randomNum = Math.floor(Math.random() * 1000)
			.toString()
			.padStart(3, '0');
		this.orderNumber = `ORD-${timestamp.slice(-6)}${randomNum}`;
	}

	// Update updatedAt on save (if not using timestamps option)
	if (!this.isNew) {
		this.updatedAt = Date.now();
	}

	next();
});

// Virtual for total items quantity
orderSchema.virtual('totalItems').get(function () {
	return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Virtual for full name in addresses
orderSchema.virtual('shippingAddress.fullName').get(function () {
	return `${this.shippingAddress.firstName} ${this.shippingAddress.lastName}`;
});

orderSchema.virtual('billingAddress.fullName').get(function () {
	return `${this.billingAddress.firstName} ${this.billingAddress.lastName}`;
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
