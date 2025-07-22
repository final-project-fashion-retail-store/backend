// utils/orderUtils.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Generate a unique order number
 * Format: ORD-YYYYMMDD-XXXX (where XXXX is a random 4-digit number)
 */
const generateOrderNumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // Generate random 4-digit number
  const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

  return `ORD-${dateStr}-${randomNum}`;
};

/**
 * Calculate order totals
 * @param {Array} items - Array of order items with price and quantity
 * @param {Number} shippingCost - Shipping cost
 * @param {Number} taxRate - Tax rate (default 0.08 = 8%)
 * @returns {Object} Object containing subtotal, taxAmount, and totalAmount
 */
const calculateOrderTotals = (items, shippingCost = 0, taxRate = 0.08) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Items array is required and cannot be empty');
  }

  const subtotal = items.reduce((sum, item) => {
    if (!item.price || !item.quantity) {
      throw new Error('Each item must have price and quantity');
    }
    return sum + (item.price * item.quantity);
  }, 0);

  const taxAmount = subtotal * taxRate;
  const totalAmount = subtotal + shippingCost + taxAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100, // Round to 2 decimal places
    taxAmount: Math.round(taxAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100
  };
};

/**
 * Validate shipping/billing address
 * @param {Object} address - Address object to validate
 * @returns {Boolean} True if valid, throws error if invalid
 */
const validateAddress = (address) => {
  const requiredFields = ['firstName', 'lastName', 'street', 'city', 'state', 'zipCode', 'country'];

  if (!address || typeof address !== 'object') {
    throw new Error('Address is required');
  }

  for (const field of requiredFields) {
    if (!address[field] || typeof address[field] !== 'string' || address[field].trim() === '') {
      throw new Error(`${field} is required in address`);
    }
  }

  // Validate zip code format (basic validation for US)
  const zipCodeRegex = /^[0-9]{5}(-[0-9]{4})?$/;
  if (address.country.toLowerCase() === 'us' || address.country.toLowerCase() === 'usa') {
    if (!zipCodeRegex.test(address.zipCode.trim())) {
      throw new Error('Invalid US zip code format');
    }
  }

  return true;
};

/**
 * Validate order items
 * @param {Array} items - Array of order items to validate
 * @returns {Boolean} True if valid, throws error if invalid
 */
const validateOrderItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Order must have at least one item');
  }

  const requiredFields = ['productId', 'quantity', 'price', 'name'];

  items.forEach((item, index) => {
    for (const field of requiredFields) {
      if (item[field] === undefined || item[field] === null) {
        throw new Error(`Item ${index + 1}: ${field} is required`);
      }
    }

    // Validate data types
    if (typeof item.quantity !== 'number' || item.quantity < 1) {
      throw new Error(`Item ${index + 1}: quantity must be a positive number`);
    }

    if (typeof item.price !== 'number' || item.price < 0) {
      throw new Error(`Item ${index + 1}: price must be a positive number`);
    }

    if (typeof item.name !== 'string' || item.name.trim() === '') {
      throw new Error(`Item ${index + 1}: name must be a non-empty string`);
    }

    // Validate importPrice if provided
    if (item.importPrice !== undefined && (typeof item.importPrice !== 'number' || item.importPrice < 0)) {
      throw new Error(`Item ${index + 1}: importPrice must be a positive number`);
    }
  });

  return true;
};

/**
 * Get order status display information
 * @param {String} status - Order status
 * @returns {Object} Status display information
 */
const getOrderStatusInfo = (status) => {
  const statusInfo = {
    pending: {
      label: 'Pending',
      color: 'warning',
      description: 'Order is waiting for payment confirmation',
      canCancel: true,
      canModify: true
    },
    processing: {
      label: 'Processing',
      color: 'info',
      description: 'Order is being prepared',
      canCancel: true,
      canModify: false
    },
    shipped: {
      label: 'Shipped',
      color: 'primary',
      description: 'Order has been shipped',
      canCancel: false,
      canModify: false
    },
    delivered: {
      label: 'Delivered',
      color: 'success',
      description: 'Order has been delivered',
      canCancel: false,
      canModify: false
    },
    cancelled: {
      label: 'Cancelled',
      color: 'danger',
      description: 'Order has been cancelled',
      canCancel: false,
      canModify: false
    }
  };

  return statusInfo[status] || {
    label: status,
    color: 'secondary',
    description: 'Unknown status',
    canCancel: false,
    canModify: false
  };
};

/**
 * Format order for email/notification
 * @param {Object} order - Order object
 * @returns {Object} Formatted order data
 */
const formatOrderForNotification = (order) => {
  return {
    orderNumber: order.orderNumber,
    totalAmount: `$${order.totalAmount.toFixed(2)}`,
    subtotal: `$${order.subtotal.toFixed(2)}`,
    shippingCost: `$${order.shippingCost.toFixed(2)}`,
    taxAmount: `$${order.taxAmount.toFixed(2)}`,
    status: getOrderStatusInfo(order.status).label,
    customerName: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
    itemCount: order.items.length,
    totalItems: order.items.reduce((total, item) => total + item.quantity, 0),
    items: order.items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      price: `$${item.price.toFixed(2)}`,
      total: `$${(item.price * item.quantity).toFixed(2)}`
    })),
    shippingAddress: formatAddress(order.shippingAddress),
    trackingNumber: order.trackingNumber || null,
    createdAt: order.createdAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  };
};

/**
 * Format address for display
 * @param {Object} address - Address object
 * @returns {String} Formatted address string
 */
const formatAddress = (address) => {
  return `${address.firstName} ${address.lastName}\n${address.street}\n${address.city}, ${address.state} ${address.zipCode}\n${address.country}`;
};

/**
 * Create Stripe payment intent
 * @param {Number} amount - Amount in dollars
 * @param {String} currency - Currency code (default: 'usd')
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Payment intent object
 */
const createStripePaymentIntent = async (amount, currency = 'usd', metadata = {}) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata: {
        ...metadata,
        timestamp: Date.now().toString()
      },
      automatic_payment_methods: {
        enabled: true,
      },
      capture_method: 'automatic',
    });

    return {
      success: true,
      paymentIntent,
      clientSecret: paymentIntent.client_secret
    };
  } catch (error) {
    console.error('Stripe payment intent creation failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Update Stripe payment intent
 * @param {String} paymentIntentId - Payment intent ID
 * @param {Object} updateData - Data to update
 * @returns {Object} Updated payment intent
 */
const updateStripePaymentIntent = async (paymentIntentId, updateData) => {
  try {
    const paymentIntent = await stripe.paymentIntents.update(paymentIntentId, updateData);
    return {
      success: true,
      paymentIntent
    };
  } catch (error) {
    console.error('Stripe payment intent update failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Cancel Stripe payment intent
 * @param {String} paymentIntentId - Payment intent ID
 * @returns {Object} Cancellation result
 */
const cancelStripePaymentIntent = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
    return {
      success: true,
      paymentIntent
    };
  } catch (error) {
    console.error('Stripe payment intent cancellation failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Retrieve Stripe payment intent
 * @param {String} paymentIntentId - Payment intent ID
 * @returns {Object} Payment intent data
 */
const retrieveStripePaymentIntent = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return {
      success: true,
      paymentIntent
    };
  } catch (error) {
    console.error('Stripe payment intent retrieval failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Create Stripe refund
 * @param {String} paymentIntentId - Payment intent ID
 * @param {Number} amount - Refund amount in dollars (optional, full refund if not provided)
 * @param {String} reason - Refund reason
 * @returns {Object} Refund result
 */
const createStripeRefund = async (paymentIntentId, amount = null, reason = 'requested_by_customer') => {
  try {
    const refundData = {
      payment_intent: paymentIntentId,
      reason
    };

    if (amount) {
      refundData.amount = Math.round(amount * 100); // Convert to cents
    }

    const refund = await stripe.refunds.create(refundData);
    return {
      success: true,
      refund
    };
  } catch (error) {
    console.error('Stripe refund creation failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Verify Stripe webhook signature
 * @param {String} body - Request body
 * @param {String} signature - Stripe signature header
 * @param {String} secret - Webhook secret
 * @returns {Object} Verification result with event data
 */
const verifyStripeWebhook = (body, signature, secret) => {
  try {
    const event = stripe.webhooks.constructEvent(body, signature, secret);
    return {
      success: true,
      event
    };
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Calculate profit margin for order
 * @param {Object} order - Order object with items
 * @returns {Object} Profit calculation
 */
const calculateOrderProfit = (order) => {
  let totalCost = 0;
  let totalRevenue = 0;

  order.items.forEach(item => {
    const itemRevenue = item.price * item.quantity;
    const itemCost = (item.importPrice || 0) * item.quantity;
    
    totalRevenue += itemRevenue;
    totalCost += itemCost;
  });

  const profit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    profit: Math.round(profit * 100) / 100,
    profitMargin: Math.round(profitMargin * 100) / 100
  };
};

/**
 * Generate order summary for reporting
 * @param {Object} order - Order object
 * @returns {Object} Order summary
 */
const generateOrderSummary = (order) => {
  const statusInfo = getOrderStatusInfo(order.status);
  const profitInfo = calculateOrderProfit(order);
  
  return {
    orderNumber: order.orderNumber,
    status: statusInfo,
    customer: {
      name: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
      userId: order.userId
    },
    financial: {
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      taxAmount: order.taxAmount,
      totalAmount: order.totalAmount,
      ...profitInfo
    },
    items: {
      count: order.items.length,
      totalQuantity: order.items.reduce((total, item) => total + item.quantity, 0),
      details: order.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: item.price * item.quantity,
        profit: (item.price - (item.importPrice || 0)) * item.quantity
      }))
    },
    dates: {
      created: order.createdAt,
      updated: order.updatedAt
    },
    shipping: {
      address: formatAddress(order.shippingAddress),
      trackingNumber: order.trackingNumber
    },
    payment: {
      method: order.paymentMethod,
      provider: order.paymentDetails.provider,
      status: order.paymentDetails.status,
      transactionId: order.paymentDetails.transactionId
    }
  };
};

module.exports = {
  generateOrderNumber,
  calculateOrderTotals,
  validateAddress,
  validateOrderItems,
  getOrderStatusInfo,
  formatOrderForNotification,
  formatAddress,
  createStripePaymentIntent,
  updateStripePaymentIntent,
  cancelStripePaymentIntent,
  retrieveStripePaymentIntent,
  createStripeRefund,
  verifyStripeWebhook,
  calculateOrderProfit,
  generateOrderSummary
};