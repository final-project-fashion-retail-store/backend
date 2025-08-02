const orderRefundedHtml = (
	firstName,
	email,
	orderNumber,
	refundAmount,
	refundItems,
	refundReason
) => {
	const itemsHtml = refundItems
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
  <title>Refund Confirmation - PurpleBee Fashion</title>
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
      margin: 20px 0;
    }
    .refund-details {
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .refund-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    .refund-table th {
      background-color: #8a2be2;
      color: white;
      padding: 10px;
      text-align: left;
    }
    .total-row {
      font-weight: bold;
      background-color: #f0f0f0;
    }
    .highlight-box {
      background-color: #e8f5e8;
      border: 1px solid #4caf50;
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
      <h1>Refund Processed</h1>
      <p>Your refund has been completed</p>
    </div>
    <div class="content">
      <p>Hello ${firstName},</p>
      
      <p>We've successfully processed your refund request. We're sorry to see this order didn't work out as expected.</p>
      
      <div class="highlight-box">
        <h3 style="margin-top: 0; color: #4caf50;">✓ Refund Confirmed</h3>
        <p><strong>Refund Amount:</strong> $${refundAmount.toFixed(2)}</p>
        <p><strong>Processing Time:</strong> 3-5 business days to appear in your account</p>
      </div>
      
      <div class="refund-details">
        <h3>Refund Details</h3>
        <p><strong>Original Order:</strong> #${orderNumber}</p>
        <p><strong>Refund Date:</strong> ${new Date().toLocaleDateString()}</p>
        
        <table class="refund-table">
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align: center;">Price</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Refund Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
            <tr class="total-row">
              <td colspan="3" style="padding: 10px; text-align: right;">Total Refund:</td>
              <td style="padding: 10px; text-align: right;">$${refundAmount.toFixed(
															2
														)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <p><strong>What happens next?</strong></p>
      <ul>
        <li>Your refund will be processed back to your original payment method</li>
        <li>Please allow 3-5 business days for the refund to appear in your account</li>
        <li>You'll receive a separate confirmation from your bank or payment provider</li>
      </ul>
      
      <p>We value your feedback and would love to hear about your experience. Your input helps us improve our products and services.</p>
      
      <div style="text-align: center;">
        <a href="https://www.purplebee.store" class="button">Continue Shopping</a>
      </div>

      <p>If you have any questions about this refund or need further assistance, please contact our customer service team at <a href="mailto:support@purplebee.store">support@purplebee.store</a> and reference order #${orderNumber}.</p>

      <p>Thank you for giving PurpleBee Fashion a try. We hope to serve you better in the future!</p>
      
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
      <p>You're receiving this email because you had a transaction with <a href="https://www.purplebee.store">purplebee.store</a></p>
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

module.exports = orderRefundedHtml;
