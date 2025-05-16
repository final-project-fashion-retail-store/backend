const welcomeText = (firstName, email) => {
	return `Hello ${firstName},

Thank you for joining the PurpleBee Fashion family! We're thrilled to have you with us.

At PurpleBee, we're committed to bringing you the latest trends and timeless classics that help you express your unique style. Your account is now active, and you're all set to explore our collections.

What you can do now:
- Browse our latest collections
- Create a wishlist of your favorite items
- Get personalized style recommendations
- Enjoy member-only discounts and early access to sales

As a welcome gift, use code WELCOME15 at checkout to receive 15% off your first purchase.

Visit our website to start shopping: https://www.purplebeefashion.com/shop

If you have any questions or need assistance, our customer service team is always ready to help at support@purplebeefashion.com.

Happy shopping!

Warmly,
The PurpleBee Fashion Team

Follow us:
Instagram: https://www.instagram.com/purplebeefashion
Facebook: https://www.facebook.com/purplebeefashion
Pinterest: https://www.pinterest.com/purplebeefashion

© ${new Date().getFullYear()} PurpleBee Fashion. All rights reserved.
You're receiving this email because you signed up at purplebeefashion.com
Email Preferences: https://www.purplebeefashion.com/preferences
Privacy Policy: https://www.purplebeefashion.com/privacy
Unsubscribe: https://www.purplebeefashion.com/unsubscribe?email=${email}`;
};

module.exports = welcomeText;
