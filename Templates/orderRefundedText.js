const orderRefundedText = (firstName, email, order) => {
	const itemsText = order.items
		.map(
			(item) =>
				`${item.name} - $${item.price} x ${item.quantity} = $${(
					item.price * item.quantity
				).toFixed(2)}`
		)
		.join('\n');

	return `Hello ${firstName},

We've successfully processed your refund request. We're sorry to see this order didn't work out as expected.

✓ REFUND CONFIRMED
Refund Amount: $${order.totalAmount.toFixed(2)}
Processing Time: 3-5 business days to appear in your account

REFUND DETAILS
Original Order: #${order.orderNumber}
Refund Date: ${new Date().toLocaleDateString()}

REFUNDED ITEMS:
${itemsText}

Total Refund: $${order.totalAmount.toFixed(2)}

What happens next?
- Your refund will be processed back to your original payment method
- Please allow 3-5 business days for the refund to appear in your account
- You'll receive a separate confirmation from your bank or payment provider

We value your feedback and would love to hear about your experience. Your input helps us improve our products and services.

Continue shopping: https://purplebee.store

If you have any questions about this refund or need further assistance, please contact our customer service team at support@purplebee.store and reference order #${
		order.orderNumber
	}.

Thank you for giving PurpleBee Fashion a try. We hope to serve you better in the future!

Best regards,
The PurpleBee Fashion Team

Follow us:
Instagram: https://www.instagram.com/purplebeefashion
Facebook: https://www.facebook.com/purplebeefashion
Pinterest: https://www.pinterest.com/purplebeefashion

© ${new Date().getFullYear()} PurpleBee Fashion. All rights reserved.
You're receiving this email because you had a transaction with purplebee.store
Email Preferences: https://purplebee.store/preferences
Privacy Policy: https://purplebee.store/privacy
Unsubscribe: https://purplebee.store/unsubscribe?email=${email}`;
};

module.exports = orderRefundedText;
