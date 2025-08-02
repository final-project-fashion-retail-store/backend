const orderDeliveredText = (firstName, email, order) => {
	const itemsText = order.items
		.map((item) => `${item.name} (Qty: ${item.quantity})`)
		.join('\n');

	return `Hello ${firstName},

📦 ORDER DELIVERED!

✓ Successfully Delivered
Order #${order.orderNumber}
Delivered on ${order.orderHistories[
		order.orderHistories.length - 1
	].timestamp.toLocaleString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})}

Great news! Your order has been successfully delivered. We hope you love your new PurpleBee Fashion items!

DELIVERY DETAILS
Order Number: #${order.orderNumber}
Tracking Number: ${order.trackingNumber}
Delivered On: ${order.orderHistories[
		order.orderHistories.length - 1
	].timestamp.toLocaleString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})}

ITEMS DELIVERED:
${itemsText}

⭐ LOVE YOUR PURCHASE?
We'd love to hear about your experience! Your review helps other fashion lovers discover great pieces and helps us continue to improve.

Write a review: https://purplebee.store/order

NEED HELP WITH YOUR ORDER?
- Returns & Exchanges: Have 30 days from delivery date
- Sizing Issues: Check our size guide or contact support
- Care Instructions: Find care labels on each item
- Missing Items: Contact us immediately for quick resolution

View order history: https://purplebee.store/order

If you have any questions about your delivered order or need assistance, our customer service team is here to help at support@purplebee.store.

Keep shopping! Check out our latest arrivals and discover your next favorite piece.

Shop new arrivals: https://purplebee.store/

Thank you for choosing PurpleBee Fashion. We can't wait to style you again!

With love,
The PurpleBee Fashion Team

Share your style and tag us:
Instagram: https://www.instagram.com/purplebeefashion
Facebook: https://www.facebook.com/purplebeefashion
Pinterest: https://www.pinterest.com/purplebeefashion

© ${new Date().getFullYear()} PurpleBee Fashion. All rights reserved.
You're receiving this email because you placed an order at purplebee.store
Email Preferences: https://purplebee.store/preferences
Privacy Policy: https://purplebee.store/privacy
Unsubscribe: https://purplebee.store/unsubscribe?email=${email}`;
};

module.exports = orderDeliveredText;
