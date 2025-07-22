exports.calculateOrderTotals = (items, shippingCost = 0, taxRate = 0.1) => {
	const subtotal = items.reduce(
		(sum, item) => sum + item.price * item.quantity,
		0
	);
	const taxAmount = subtotal * taxRate;
	const totalAmount = subtotal + shippingCost + taxAmount;

	return {
		subtotal: Math.round(subtotal * 100) / 100, // Round to 2 decimal places
		taxAmount: Math.round(taxAmount * 100) / 100,
		totalAmount: Math.round(totalAmount * 100) / 100,
	};
};
