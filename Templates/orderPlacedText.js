const orderPlacedText = (firstName, email, order) => {
	const itemsText = order.items
		.map(
			(item) =>
				`${item.name} - $${item.price} x ${item.quantity} = $${(
					item.price * item.quantity
				).toFixed(2)}`
		)
		.join('\n');

	return `Hello ${firstName},

Great news! Your order has been successfully placed and is being prepared for shipment.

ORDER DETAILS
Order Number: #${order.orderNumber}
Order Date: ${new Date().toLocaleDateString()}

ITEMS ORDERED:
${itemsText}

Order Total: $${order.totalAmount.toFixed(2)}

SHIPPING ADDRESS:
${order.shippingAddress.name}
${order.shippingAddress.ward}
${order.shippingAddress.formattedAddress}

What happens next?
- We'll process your order within 1-2 business days
- You'll receive a shipping confirmation email with tracking information
- Your order will arrive within 3-7 business days

Track your order: https://www.purplebee.store/order

If you have any questions about your order, please don't hesitate to contact our customer service team at support@purplebee.store or reference order #${
		order.orderNumber
	}.

Thank you for choosing PurpleBee Fashion!

Best regards,
The PurpleBee Fashion Team

Follow us:
Instagram: https://www.instagram.com/purplebeefashion
Facebook: https://www.facebook.com/purplebeefashion
Pinterest: https://www.pinterest.com/purplebeefashion

© ${new Date().getFullYear()} PurpleBee Fashion. All rights reserved.
You're receiving this email because you placed an order at purplebee.store
Email Preferences: https://www.purplebee.store/preferences
Privacy Policy: https://www.purplebee.store/privacy
Unsubscribe: https://www.purplebee.store/unsubscribe?email=${email}`;
};

module.exports = orderPlacedText;
