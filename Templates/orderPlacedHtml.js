const orderPlacedHtml = (firstName, email, order) => {
	const itemsHtml = order.items
		.map(
			(item) =>
				`<tr>
			<td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
			<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">$${
				item.price
			}</td>
			<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${
				item.quantity
			}</td>
			<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${(
				item.price * item.quantity
			).toFixed(2)}</td>
		</tr>`
		)
		.join('');

	return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation - PurpleBee Fashion</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 20px 0;
      background-color: #8a2be2;
      color: white;
    }
    .content {
      padding: 20px;
      background-color: #ffffff;
    }
    .footer {
      text-align: center;
      padding: 15px;
      background-color: #f5f5f5;
      font-size: 12px;
      color: #666666;
    }
    .button {
      display: inline-block;
      background-color: #8a2be2;
      text-color: white;
      color: white;
      text-decoration: none;
      padding: 10px 20px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .order-details {
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .order-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    .order-table th {
      background-color: #8a2be2;
      color: white;
      padding: 10px;
      text-align: left;
    }
    .total-row {
      font-weight: bold;
      background-color: #f0f0f0;
    }
    .social-links {
      text-align: center;
      margin: 20px 0;
    }
    .social-links a {
      margin: 0 10px;
      text-decoration: none;
      color: #8a2be2;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Order Confirmation</h1>
      <p>Thank you for your purchase!</p>
    </div>
    <div class="content">
      <p>Hello ${firstName},</p>
      
      <p>Great news! Your order has been successfully placed and is being prepared for shipment.</p>
      
      <div class="order-details">
        <h3>Order Details</h3>
        <p><strong>Order Number:</strong> #${order.orderNumber}</p>
        <p><strong>Order Date:</strong> ${new Date().toLocaleDateString()}</p>
        
        <table class="order-table">
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align: center;">Price</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
            <tr class="total-row">
              <td colspan="3" style="padding: 10px; text-align: right;">Order Total:</td>
              <td style="padding: 10px; text-align: right;">$${order.totalAmount.toFixed(
															2
														)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div class="order-details">
        <h3>Shipping Address</h3>
        <p>
          ${order.shippingAddress.fullName}<br>
          ${order.shippingAddress.ward}<br>
          ${order.shippingAddress.formattedAddress}
        </p>
      </div>
      
      <p><strong>What happens next?</strong></p>
      <ul>
        <li>We'll process your order within 1-2 business days</li>
        <li>You'll receive a shipping confirmation email with tracking information</li>
        <li>Your order will arrive within 3-7 business days</li>
      </ul>
      
      <div style="text-align: center;">
        <a href="https://www.purplebee.store/order" class="button">Track Your Order</a>
      </div>

      <p>If you have any questions about your order, please don't hesitate to contact our customer service team at <a href="mailto:support@purplebee.store">support@purplebee.store</a> or reference order #${
							order.orderNumber
						}.</p>

      <p>Thank you for choosing PurpleBee Fashion!</p>
      
      <p>Best regards,<br>
      The PurpleBee Fashion Team</p>
      
      <div class="social-links">
        <p>Follow us for style inspiration:</p>
        <a href="https://www.instagram.com/purplebeefashion">Instagram</a> |
        <a href="https://www.facebook.com/purplebeefashion">Facebook</a> |
        <a href="https://www.pinterest.com/purplebeefashion">Pinterest</a>
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} PurpleBee Fashion. All rights reserved.</p>
      <p>You're receiving this email because you placed an order at <a href="https://purplebee.store">purplebee.store</a></p>
      <p>
        <a href="https://purplebee.store/preferences">Email Preferences</a> |
        <a href="https://purplebee.store/privacy">Privacy Policy</a> |
        <a href="https://purplebee.store/unsubscribe?email=${email}">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`;
};

module.exports = orderPlacedHtml;
