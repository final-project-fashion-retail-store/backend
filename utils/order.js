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

exports.updateProductInventory = async (orderItems, Product) => {
	try {
		// Group items by product to minimize database operations
		const productUpdates = {};

		orderItems.forEach((item) => {
			const productId = item.product.toString();
			if (!productUpdates[productId]) {
				productUpdates[productId] = [];
			}
			productUpdates[productId].push({
				variantId: item.variantId,
				quantity: item.quantity,
			});
		});

		// Update each product
		for (const [productId, variants] of Object.entries(productUpdates)) {
			const product = await Product.findById(productId);
			if (!product) {
				console.error(`Product not found: ${productId}`);
				continue;
			}

			let hasInventoryChanges = false;

			// Update each variant's inventory
			variants.forEach(({ variantId, quantity }) => {
				const variant = product.variants.find(
					(v) => v._id.toString() === variantId.toString()
				);

				if (variant) {
					if (variant.inventory >= quantity) {
						variant.inventory -= quantity;
						hasInventoryChanges = true;
					} else {
						console.error(
							`Insufficient inventory for variant ${variantId}. Available: ${variant.inventory}, Required: ${quantity}`
						);
					}
				}
			});

			if (hasInventoryChanges) {
				// Check if any variant still has inventory
				const hasStock = product.variants.some((variant) => variant.inventory > 0);
				product.inStock = hasStock;

				await product.save();
				console.log(`Updated inventory for product: ${product.name}`);
			}
		}
	} catch (error) {
		console.error('Error updating product inventory:', error);
		throw error;
	}
};
