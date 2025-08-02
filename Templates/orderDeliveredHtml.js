const orderDeliveredHtml = (
	firstName,
	email,
	orderNumber,
	deliveryDate,
	trackingNumber,
	orderItems
) => {
	const itemsHtml = orderItems
		.map(
			(item) =>
				`<tr>
			<td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
			<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
		</tr>`
		)
		.join('');

	return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Delivered - PurpleBee Fashion</title>
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
      color: white;
      text-decoration: none;
      padding: 10px 20px;
      border-radius: 5px;
      margin: 10px 5px;
    }
    .delivery-details {
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .delivery-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    .delivery-table th {
      background-color: #8a2be2;
      color: white;
      padding: 10px;
      text-align: left;
    }
    .highlight-box {
      background-color: #e8f5e8;
      border: 1px solid #4caf50;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
      text-align: center;
    }
    .review-section {
      background-color: #fff7e6;
      border: 1px solid #ffa726;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
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
      <h1>📦 Order Delivered!</h1>
      <p>Your PurpleBee Fashion order has arrived</p>
    </div>
    <div class="content">
      <p>Hello ${firstName},</p>
      
      <div class="highlight-box">
        <h2 style="margin-top: 0; color: #4caf50;">✓ Successfully Delivered</h2>
        <p style="font-size: 18px; margin: 10px 0;"><strong>Order #${orderNumber}</strong></p>
        <p>Delivered on ${deliveryDate}</p>
      </div>
      
      <p>Great news! Your order has been successfully delivered. We hope you love your new PurpleBee Fashion items!</p>
      
      <div class="delivery-details">
        <h3>Delivery Details</h3>
        <p><strong>Order Number:</strong> #${orderNumber}</p>
        <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
        <p><strong>Delivered On:</strong> ${deliveryDate}</p>
        
        <table class="delivery-table">
          <thead>
            <tr>
              <th>Items Delivered</th>
              <th style="text-align: center;">Quantity</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      </div>
      
      <div class="review-section">
        <h3 style="margin-top: 0;">⭐ Love Your Purchase?</h3>
        <p>We'd love to hear about your experience! Your review helps other fashion lovers discover great pieces and helps us continue to improve.</p>
        <div style="text-align: center;">
          <a href="https://www.purplebee.store/order" class="button">Write a Review</a>
        </div>
      </div>
      
      <p><strong>Need help with your order?</strong></p>
      <ul>
        <li><strong>Returns & Exchanges:</strong> Have 30 days from delivery date</li>
        <li><strong>Sizing Issues:</strong> Check our size guide or contact support</li>
        <li><strong>Care Instructions:</strong> Find care labels on each item</li>
        <li><strong>Missing Items:</strong> Contact us immediately for quick resolution</li>
      </ul>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://www.purplebee.store/order" class="button">View Order History</a>
      </div>

      <p>If you have any questions about your delivered order or need assistance, our customer service team is here to help at <a href="mailto:support@purplebee.store">support@purplebee.store</a>.</p>

      <p><strong>Keep shopping!</strong> Check out our latest arrivals and discover your next favorite piece.</p>
      
      <div style="text-align: center;">
        <a href="https://www.purplebee.store" class="button">Shop New Arrivals</a>
      </div>
      
      <p>Thank you for choosing PurpleBee Fashion. We can't wait to style you again!</p>
      
      <p>With love,<br>
      The PurpleBee Fashion Team</p>
      
      <div class="social-links">
        <p>Share your style and tag us:</p>
        <a href="https://www.instagram.com/purplebeefashion">Instagram</a> |
        <a href="https://www.facebook.com/purplebeefashion">Facebook</a> |
        <a href="https://www.pinterest.com/purplebeefashion">Pinterest</a>
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} PurpleBee Fashion. All rights reserved.</p>
      <p>You're receiving this email because you placed an order at <a href="https://www.purplebee.store">purplebee.store</a></p>
      <p>
        <a href="https://www.purplebee.store/preferences">Email Preferences</a> |
        <a href="https://www.purplebee.store/privacy">Privacy Policy</a> |
        <a href="https://www.purplebee.store/unsubscribe?email=${email}">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`;
};

module.exports = orderDeliveredHtml;
