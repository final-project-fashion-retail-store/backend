const forgotPasswordHtml = (firstName, resetUrl, expiryTime) => {
	return `
  <!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your PurpleBee Fashion Password</title>
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
    .reset-box {
      background-color: #f9f9f9;
      border: 1px solid #dddddd;
      padding: 15px;
      margin: 20px 0;
      border-radius: 5px;
      text-align: center;
    }
    .warning {
      color: #d9534f;
      font-size: 14px;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset Request</h1>
    </div>
    <div class="content">
      <p>Hello ${firstName},</p>
      
      <p>We received a request to reset your password for your PurpleBee Fashion account. If you didn't make this request, you can safely ignore this email.</p>
      
      <div class="reset-box">
        <p><strong>To reset your password, please click the button below:</strong></p>
        <a href="${resetUrl}" class="button">Reset My Password</a>
        <p class="warning">This link will expire at ${expiryTime} (valid for ${10} minutes).</p>
      </div>
      
      <p>If the button above doesn't work, you can copy and paste the following link into your browser:</p>
      <p style="word-break: break-all; font-size: 14px;">${resetUrl}</p>
      
      <p>After resetting your password, you'll be able to log in with your new password.</p>
      
      <p>If you didn't request a password reset, please contact our support team immediately at <a href="mailto:support@purplebeefashion.com">support@purplebeefashion.com</a>.</p>
      
      <p>Thank you for shopping with PurpleBee Fashion!</p>
      
      <p>Best regards,<br>
      The PurpleBee Fashion Team</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} PurpleBee Fashion. All rights reserved.</p>
      <p>This is an automated message, please do not reply to this email.</p>
      <p>
        <a href="https://www.purplebeefashion.com/privacy">Privacy Policy</a> |
        <a href="https://www.purplebeefashion.com/contact">Contact Us</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
};

module.exports = forgotPasswordHtml;
