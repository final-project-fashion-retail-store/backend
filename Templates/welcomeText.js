const welcomeText = (firstName, email) => {
	return `Hello ${firstName},

Thank you for joining the PurpleBee Fashion family! We're thrilled to have you with us.

At PurpleBee, we're committed to bringing you the latest trends and timeless classics that help you express your unique style. Your account is now active, and you're all set to explore our collections.

What you can do now:
- Browse our latest collections
- Create a wishlist of your favorite items
- Get personalized style recommendations
- Enjoy member-only discounts and early access to sales

Visit our website to start shopping: https://purplebee.store

If you have any questions or need assistance, our customer service team is always ready to help at support@purplebee.store.

Happy shopping!

Warmly,
The PurpleBee Fashion Team

Follow us:
Instagram: https://www.instagram.com/purplebeefashion
Facebook: https://www.facebook.com/purplebeefashion
Pinterest: https://www.pinterest.com/purplebeefashion

© ${new Date().getFullYear()} PurpleBee Fashion. All rights reserved.
You're receiving this email because you signed up at purplebee.store
Email Preferences: https://purplebee.store/preferences
Privacy Policy: https://purplebee.store/privacy
Unsubscribe: https://purplebee.store/unsubscribe?email=${email}`;
};

module.exports = welcomeText;
