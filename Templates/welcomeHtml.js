const welcomeHtml = (firstName, email) => {
	return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to PurpleBee Fashion!</title>
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
      background-color: #8a2be2; /* Purple color */
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
      <h1>Welcome to PurpleBee Fashion!</h1>
    </div>
    <div class="content">
      <p>Hello ${firstName},</p>
      
      <p>Thank you for joining the PurpleBee Fashion family! We're thrilled to have you with us.</p>
      
      <p>At PurpleBee, we're committed to bringing you the latest trends and timeless classics that help you express your unique style. Your account is now active, and you're all set to explore our collections.</p>
      
      <p><strong>What you can do now:</strong></p>
      <ul>
        <li>Browse our latest collections</li>
        <li>Create a wishlist of your favorite items</li>
        <li>Get personalized style recommendations</li>
        <li>Enjoy member-only discounts and early access to sales</li>
      </ul>
      
      <div style="text-align: center;">
        <a href="https://www.purplebeefashion.com/shop" class="button">Start Shopping</a>
      </div>
      
      <p>As a welcome gift, use code <strong>WELCOME15</strong> at checkout to receive 15% off your first purchase.</p>
      
      <p>If you have any questions or need assistance, our customer service team is always ready to help at <a href="mailto:support@purplebeefashion.com">support@purplebeefashion.com</a>.</p>
      
      <p>Happy shopping!</p>
      
      <p>Warmly,<br>
      The PurpleBee Fashion Team</p>
      
      <div class="social-links">
        <p>Follow us for style inspiration and updates:</p>
        <a href="https://www.instagram.com/purplebeefashion">Instagram</a> |
        <a href="https://www.facebook.com/purplebeefashion">Facebook</a> |
        <a href="https://www.pinterest.com/purplebeefashion">Pinterest</a>
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} PurpleBee Fashion. All rights reserved.</p>
      <p>You're receiving this email because you signed up at <a href="https://www.purplebeefashion.com">purplebeefashion.com</a></p>
      <p>
        <a href="https://www.purplebeefashion.com/preferences">Email Preferences</a> |
        <a href="https://www.purplebeefashion.com/privacy">Privacy Policy</a> |
        <a href="https://www.purplebeefashion.com/unsubscribe?email=${email}">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`;
};

module.exports = welcomeHtml;
