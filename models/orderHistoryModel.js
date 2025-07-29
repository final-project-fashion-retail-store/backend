const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderHistorySchema = new Schema({
	order: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Order',
		required: true,
	},
	status: {
		type: String,
		enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
		required: true,
	},
	timestamp: {
		type: Date,
		default: Date.now,
	},
	updatedBy: mongoose.Schema.Types.ObjectId,
});

const OrderHistory = mongoose.model('OrderHistory', orderHistorySchema);
module.exports = OrderHistory;
