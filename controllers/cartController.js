const Cart = require('../models/cartModel');
const Product = require('../models/productModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getCart = catchAsync(async (req, res, next) => {
	const cart = await Cart.findOne({ user: req.user._id }).populate(
		'items.product'
	);

	res.status(200).json({
		status: 'success',
		results: cart ? cart.items.length : 0,
		data: {
			cart,
		},
	});
});

exports.addToCart = catchAsync(async (req, res, next) => {
	const { productId, variantId, quantity } = req.body;

	if (!productId || !variantId || !quantity) {
		return next(new AppError('Missing required fields', 400));
	}

	let cart = await Cart.findOne({ user: req.user._id });

	// Check product existence and quantity and variant availability
	const product = await Product.findById(productId);
	if (!product) {
		return next(new AppError('Product not found', 404));
	}
	const variant = product.variants.find((v) => v._id.toString() === variantId);
	if (!variant) {
		return next(new AppError('Product variant not found', 404));
	}
	if (variant.inventory < quantity) {
		return next(
			new AppError('Insufficient inventory for the selected variant', 400)
		);
	}

	if (!cart) {
		cart = await Cart.create({ user: req.user._id });
	}

	const existingItemIndex = cart.items.findIndex(
		(item) =>
			item.product.toString() === productId &&
			item.variantId.toString() === variantId
	);

	if (existingItemIndex > -1) {
		cart.items[existingItemIndex].quantity += quantity;
	} else {
		cart.items.push({
			product: productId,
			variantId,
			quantity,
		});
	}

	await cart.save();
	await cart.populate('items.product');

	res.status(200).json({
		status: 'success',
		data: {
			cart,
		},
	});
});

exports.updateCartProduct = catchAsync(async (req, res, next) => {
	const { productId, variantId, quantity, color, size } = req.body;

	if (!productId || !variantId || !quantity) {
		return next(new AppError('Missing required fields', 400));
	}

	const cart = await Cart.findOne({ user: req.user._id });

	if (!cart) {
		return next(new AppError('Cart not found', 404));
	}

	const itemIndex = cart.items.findIndex(
		(item) =>
			item.product.toString() === productId &&
			item.variantId.toString() === variantId
	);

	if (itemIndex === -1) {
		return next(new AppError('Cart item not found', 404));
	}

	const currentItem = cart.items[itemIndex];

	// If color or size is being updated, we need to find the new variant
	if (color || size) {
		const product = await Product.findById(productId);

		if (!product) {
			return next(new AppError('Product not found', 404));
		}

		// Find the new variant based on updated color/size or keep existing values
		const newColor = color || currentItem.color;
		const newSize = size || currentItem.size;

		const newVariant = product.variants.find(
			(variant) => variant.color === newColor && variant.size === newSize
		);

		if (!newVariant) {
			return next(
				new AppError(
					'Product variant not found for the selected color and size',
					404
				)
			);
		}

		// Check if this exact variant (product + new variant) already exists in cart
		const existingItemIndex = cart.items.findIndex(
			(item) =>
				item.product.toString() === productId &&
				item.variantId.toString() === newVariant._id.toString() &&
				itemIndex !== cart.items.indexOf(item) // Don't match the current item
		);

		if (existingItemIndex !== -1) {
			// If the new variant already exists in cart, check combined quantity
			const combinedQuantity = cart.items[existingItemIndex].quantity + quantity;

			if (newVariant.inventory < combinedQuantity) {
				return next(
					new AppError('Insufficient inventory for the selected variant', 400)
				);
			}

			// Merge quantities and remove the old item
			cart.items[existingItemIndex].quantity = combinedQuantity;
			cart.items.splice(itemIndex, 1);
		} else {
			// Check if inventory is sufficient for new variant
			if (newVariant.inventory < quantity) {
				return next(
					new AppError('Insufficient inventory for the selected variant', 400)
				);
			}

			// Update the current item with new variant details
			currentItem.variantId = newVariant._id;
			currentItem.color = newVariant.color;
			currentItem.size = newVariant.size;
			currentItem.price = newVariant.salePrice || newVariant.price;
			currentItem.sku = newVariant.sku;
			currentItem.quantity = quantity;
		}
	} else {
		// Only quantity is being updated
		const product = await Product.findById(productId);

		if (!product) {
			return next(new AppError('Product not found', 404));
		}

		const variant = product.variants.find((v) => v._id.toString() === variantId);

		if (!variant) {
			return next(new AppError('Product variant not found', 404));
		}

		// Check if inventory is sufficient
		if (variant.inventory < quantity) {
			return next(new AppError('Insufficient inventory', 400));
		}

		currentItem.quantity = quantity;
	}

	await cart.save();
	await cart.populate('items.product');

	res.status(200).json({
		status: 'success',
		data: {
			cart,
		},
	});
});

exports.removeFromCart = catchAsync(async (req, res, next) => {
	const { productId, variantId } = req.body;

	if (!productId || !variantId) {
		return next(new AppError('Missing required fields', 400));
	}

	const cart = await Cart.findOne({ user: req.user._id });

	if (!cart) {
		return next(new AppError('Cart not found', 404));
	}

	const itemIndex = cart.items.findIndex(
		(item) =>
			item.product.toString() === productId &&
			item.variantId.toString() === variantId
	);

	if (itemIndex === -1) {
		return next(new AppError('Cart item not found', 404));
	}

	cart.items.splice(itemIndex, 1);
	await cart.save();

	res.status(204).json({
		status: 'success',
		data: null,
	});
});
