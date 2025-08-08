const catchAsync = require('../utils/catchAsync');
const Order = require('../models/orderModel');
const User = require('../models/userModel');
const Product = require('../models/productModel');
const Wishlist = require('../models/wishlistModel');
const apiFeatures = require('../utils/apiFeatures');

const getDateRange = (period) => {
	const now = new Date();
	let startDate;

	switch (period) {
		case '7days':
			startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
			break;
		case '30days':
			startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
			break;
		case '3months':
			startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
			break;
		case '6months':
			startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
			break;
		case '1year':
			startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
			break;
		default:
			startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
	}

	return { startDate, endDate: now };
};

exports.getBusinessInsights = catchAsync(async (req, res, next) => {
	const { period = '6months' } = req.query;
	const { startDate, endDate } = getDateRange(period);

	// Previous period for comparison
	const periodDiff = endDate.getTime() - startDate.getTime();
	const prevStartDate = new Date(startDate.getTime() - periodDiff);
	const prevEndDate = startDate;

	const [currentStats, prevStats, activeUsers] = await Promise.all([
		// 🟢 Current period stats
		Order.aggregate([
			{
				$match: {
					createdAt: { $gte: startDate, $lte: endDate },
					status: { $ne: 'cancelled' },
				},
			},
			{
				$set: {
					itemsCost: {
						$reduce: {
							input: '$items',
							initialValue: 0,
							in: {
								$add: [
									'$$value',
									{ $multiply: ['$$this.importPrice', '$$this.quantity'] },
								],
							},
						},
					},
				},
			},
			{
				$group: {
					_id: null,
					totalRevenue: { $sum: '$totalAmount' },
					totalImportCost: { $sum: '$itemsCost' },
					totalTax: { $sum: '$taxAmount' },
					totalShippingCost: { $sum: '$shippingCost' },
					totalOrders: { $sum: 1 },
					avgOrderValue: { $avg: '$totalAmount' },
				},
			},
			{
				$addFields: {
					totalRevenueWithoutTax: {
						$subtract: ['$totalRevenue', '$totalTax'],
					},
					totalProfit: {
						$subtract: [
							'$totalRevenue',
							{ $add: ['$totalImportCost', '$totalTax', '$totalShippingCost'] },
						],
					},
				},
			},
		]),

		// 🟡 Previous period stats
		Order.aggregate([
			{
				$match: {
					createdAt: { $gte: prevStartDate, $lte: prevEndDate },
					status: { $ne: 'cancelled' },
				},
			},
			{
				$group: {
					_id: null,
					totalRevenue: { $sum: '$totalAmount' },
					totalOrders: { $sum: 1 },
					avgOrderValue: { $avg: '$totalAmount' },
				},
			},
		]),

		// 🔵 Active users count
		User.countDocuments({ active: true }),
	]);

	// Default fallback
	const current = currentStats[0] || {
		totalRevenue: 0,
		totalOrders: 0,
		avgOrderValue: 0,
		totalProfit: 0,
		totalRevenueWithoutTax: 0,
		totalImportCost: 0,
		totalTax: 0,
		totalShippingCost: 0,
	};
	const previous = prevStats[0] || {
		totalRevenue: 0,
		totalOrders: 0,
		avgOrderValue: 0,
	};

	// 🧮 Percentage changes
	const revenueChange =
		previous.totalRevenue > 0
			? (
					((current.totalRevenue - previous.totalRevenue) / previous.totalRevenue) *
					100
			  ).toFixed(1)
			: 0;

	const ordersChange =
		previous.totalOrders > 0
			? (
					((current.totalOrders - previous.totalOrders) / previous.totalOrders) *
					100
			  ).toFixed(1)
			: 0;

	const avgOrderChange =
		previous.avgOrderValue > 0
			? (
					((current.avgOrderValue - previous.avgOrderValue) /
						previous.avgOrderValue) *
					100
			  ).toFixed(1)
			: 0;

	res.json({
		success: true,
		data: {
			totalRevenue: {
				value: current.totalRevenue,
				change: parseFloat(revenueChange),
			},
			totalOrders: {
				value: current.totalOrders,
				change: parseFloat(ordersChange),
			},
			activeUsers: {
				value: activeUsers,
			},
			avgOrderValue: {
				value: current.avgOrderValue,
				change: parseFloat(avgOrderChange),
			},
			totalProfit: current.totalProfit,
			profitMargin:
				current.totalRevenueWithoutTax > 0
					? ((current.totalProfit / current.totalRevenueWithoutTax) * 100).toFixed(1)
					: 0,
			breakdown: {
				totalRevenueWithoutTax: current.totalRevenueWithoutTax,
				totalImportCost: current.totalImportCost,
				totalTax: current.totalTax,
				totalShippingCost: current.totalShippingCost,
			},
		},
	});
});

exports.getRevenueTrends = catchAsync(async (req, res) => {
	const { period = '6months' } = req.query;
	const { startDate, endDate } = getDateRange(period);

	// Grouping logic
	let groupFormat;
	let dateFormat;

	if (period === '7days' || period === '30days') {
		groupFormat = {
			year: { $year: '$createdAt' },
			month: { $month: '$createdAt' },
			day: { $dayOfMonth: '$createdAt' },
		};
		dateFormat = '%Y-%m-%d';
	} else {
		groupFormat = {
			year: { $year: '$createdAt' },
			month: { $month: '$createdAt' },
		};
		dateFormat = '%Y-%m';
	}

	const trends = await Order.aggregate([
		{
			$match: {
				createdAt: { $gte: startDate, $lte: endDate },
				status: { $ne: 'cancelled' },
			},
		},
		{
			$set: {
				itemsCost: {
					$reduce: {
						input: '$items',
						initialValue: 0,
						in: {
							$add: [
								'$$value',
								{ $multiply: ['$$this.importPrice', '$$this.quantity'] },
							],
						},
					},
				},
			},
		},
		{
			$group: {
				_id: groupFormat,
				revenue: { $sum: '$totalAmount' },
				totalImportCost: { $sum: '$itemsCost' },
				totalTax: { $sum: '$taxAmount' },
				totalShipping: { $sum: '$shippingCost' },
				orders: { $sum: 1 },
			},
		},
		{
			$addFields: {
				profit: {
					$subtract: [
						'$revenue',
						{ $add: ['$totalImportCost', '$totalTax', '$totalShipping'] },
					],
				},
				date: {
					$dateFromString: {
						dateString: {
							$concat: [
								{ $toString: '$_id.year' },
								'-',
								{ $toString: '$_id.month' },
								period === '7days' || period === '30days'
									? {
											$concat: ['-', { $toString: '$_id.day' }],
									  }
									: '',
							],
						},
					},
				},
			},
		},
		{ $sort: { date: 1 } },
	]);

	res.json({
		success: true,
		data: trends.map((item) => ({
			date: item.date,
			revenue: item.revenue,
			profit: item.profit,
			orders: item.orders,
		})),
	});
});

exports.getPaymentMethods = catchAsync(async (req, res) => {
	const { period = '6months' } = req.query;
	const { startDate, endDate } = getDateRange(period);

	const paymentDistribution = await Order.aggregate([
		{
			$match: {
				createdAt: { $gte: startDate, $lte: endDate },
				status: { $ne: 'cancelled' },
			},
		},
		{
			$group: {
				_id: '$paymentMethod',
				count: { $sum: 1 },
				revenue: { $sum: '$totalAmount' },
			},
		},
		{
			$project: {
				method: '$_id',
				count: 1,
				revenue: 1,
				_id: 0,
			},
		},
	]);

	const total = paymentDistribution.reduce((sum, item) => sum + item.count, 0);

	const formattedData = paymentDistribution.map((item) => ({
		method: item.method,
		count: item.count,
		revenue: item.revenue,
		percentage: ((item.count / total) * 100).toFixed(1),
	}));

	res.json({
		success: true,
		data: formattedData,
	});
});

exports.getOrderStatus = catchAsync(async (req, res) => {
	const { period = '6months' } = req.query;
	const { startDate, endDate } = getDateRange(period);

	const statusBreakdown = await Order.aggregate([
		{
			$match: {
				createdAt: { $gte: startDate, $lte: endDate },
			},
		},
		{
			$group: {
				_id: '$status',
				count: { $sum: 1 },
				revenue: { $sum: '$totalAmount' },
			},
		},
		{
			$project: {
				status: '$_id',
				count: 1,
				revenue: 1,
				_id: 0,
			},
		},
	]);

	const total = statusBreakdown.reduce((sum, item) => sum + item.count, 0);

	const formattedData = statusBreakdown.map((item) => ({
		status: item.status,
		count: item.count,
		revenue: item.revenue,
		percentage: ((item.count / total) * 100).toFixed(1),
	}));

	res.json({
		success: true,
		data: formattedData,
	});
});

exports.getTopProducts = catchAsync(async (req, res) => {
	const { period = '6months', limit = 5 } = req.query;
	const { startDate, endDate } = getDateRange(period);

	const topProducts = await Order.aggregate([
		{
			$match: {
				createdAt: { $gte: startDate, $lte: endDate },
				status: { $ne: 'cancelled' },
			},
		},
		{ $unwind: '$items' },
		{
			$group: {
				_id: '$items.product',
				productName: { $first: '$items.name' },
				totalQuantity: { $sum: '$items.quantity' },
				totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
				totalOrders: { $sum: 1 },
			},
		},
		{
			$lookup: {
				from: 'products',
				localField: '_id',
				foreignField: '_id',
				as: 'productInfo',
			},
		},
		{
			$project: {
				productName: 1,
				totalQuantity: 1,
				totalRevenue: 1,
				totalOrders: 1,
				averageRating: { $arrayElemAt: ['$productInfo.averageRating', 0] },
				totalReviews: { $arrayElemAt: ['$productInfo.totalReviews', 0] },
			},
		},
		{ $sort: { totalQuantity: -1 } },
		{ $limit: parseInt(limit) },
	]);

	res.json({
		success: true,
		data: topProducts,
	});
});

exports.getUserRegistrationActivity = catchAsync(async (req, res) => {
	const { period = '6months' } = req.query;
	const { startDate, endDate } = getDateRange(period);

	// Determine grouping format based on period
	let groupFormat;
	let dateFormat;

	if (period === '7days' || period === '30days') {
		groupFormat = {
			year: { $year: '$createdAt' },
			month: { $month: '$createdAt' },
			day: { $dayOfMonth: '$createdAt' },
		};
		dateFormat = '%Y-%m-%d';
	} else {
		groupFormat = {
			year: { $year: '$createdAt' },
			month: { $month: '$createdAt' },
		};
		dateFormat = '%Y-%m';
	}

	const [newUsersData, activeUsersData] = await Promise.all([
		// New user registrations over time
		User.aggregate([
			{
				$match: {
					createdAt: { $gte: startDate, $lte: endDate },
				},
			},
			{
				$group: {
					_id: groupFormat,
					newUsers: { $sum: 1 },
				},
			},
			{
				$addFields: {
					date: {
						$dateFromString: {
							dateString: {
								$concat: [
									{ $toString: '$_id.year' },
									'-',
									{
										$toString: {
											$cond: {
												if: { $lt: ['$_id.month', 10] },
												then: { $concat: ['0', { $toString: '$_id.month' }] },
												else: { $toString: '$_id.month' },
											},
										},
									},
									period === '7days' || period === '30days'
										? {
												$concat: [
													'-',
													{
														$toString: {
															$cond: {
																if: { $lt: ['$_id.day', 10] },
																then: { $concat: ['0', { $toString: '$_id.day' }] },
																else: { $toString: '$_id.day' },
															},
														},
													},
												],
										  }
										: '-01',
								],
							},
						},
					},
				},
			},
			{ $sort: { date: 1 } },
		]),

		// Active users (users who made orders) over time
		Order.aggregate([
			{
				$match: {
					createdAt: { $gte: startDate, $lte: endDate },
					status: { $ne: 'cancelled' },
				},
			},
			{
				$group: {
					_id: {
						...groupFormat,
						user: '$user',
					},
				},
			},
			{
				$group: {
					_id: {
						year: '$_id.year',
						month: '$_id.month',
						...(period === '7days' || period === '30days' ? { day: '$_id.day' } : {}),
					},
					activeUsers: { $sum: 1 },
				},
			},
			{
				$addFields: {
					date: {
						$dateFromString: {
							dateString: {
								$concat: [
									{ $toString: '$_id.year' },
									'-',
									{
										$toString: {
											$cond: {
												if: { $lt: ['$_id.month', 10] },
												then: { $concat: ['0', { $toString: '$_id.month' }] },
												else: { $toString: '$_id.month' },
											},
										},
									},
									period === '7days' || period === '30days'
										? {
												$concat: [
													'-',
													{
														$toString: {
															$cond: {
																if: { $lt: ['$_id.day', 10] },
																then: { $concat: ['0', { $toString: '$_id.day' }] },
																else: { $toString: '$_id.day' },
															},
														},
													},
												],
										  }
										: '-01',
								],
							},
						},
					},
				},
			},
			{ $sort: { date: 1 } },
		]),
	]);

	// Create a complete timeline and merge data
	const timelineMap = new Map();

	// Initialize timeline with all dates in range
	const current = new Date(startDate);
	while (current <= endDate) {
		const dateKey = current.toISOString().split('T')[0];
		if (period === '7days' || period === '30days') {
			timelineMap.set(dateKey, { date: dateKey, newUsers: 0, activeUsers: 0 });
			current.setDate(current.getDate() + 1);
		} else {
			const monthKey = `${current.getFullYear()}-${String(
				current.getMonth() + 1
			).padStart(2, '0')}-01`;
			timelineMap.set(monthKey, { date: monthKey, newUsers: 0, activeUsers: 0 });
			current.setMonth(current.getMonth() + 1);
		}
	}

	// Merge new users data
	newUsersData.forEach((item) => {
		const dateKey = item.date.toISOString().split('T')[0];
		if (timelineMap.has(dateKey)) {
			timelineMap.get(dateKey).newUsers = item.newUsers;
		}
	});

	// Merge active users data
	activeUsersData.forEach((item) => {
		const dateKey = item.date.toISOString().split('T')[0];
		if (timelineMap.has(dateKey)) {
			timelineMap.get(dateKey).activeUsers = item.activeUsers;
		}
	});

	const timeline = Array.from(timelineMap.values()).sort(
		(a, b) => new Date(a.date) - new Date(b.date)
	);

	res.json({
		success: true,
		data: timeline,
	});
});

exports.getOrdersByLocation = catchAsync(async (req, res) => {
	const { period = '6months', limit = 10 } = req.query;
	const { startDate, endDate } = getDateRange(period);

	const ordersByLocation = await Order.aggregate([
		{
			$match: {
				createdAt: { $gte: startDate, $lte: endDate },
				status: { $ne: 'cancelled' },
			},
		},
		{
			$lookup: {
				from: 'addresses',
				localField: 'shippingAddress',
				foreignField: '_id',
				as: 'shippingInfo',
			},
		},
		{
			$unwind: '$shippingInfo',
		},
		{
			$group: {
				_id: '$shippingInfo.city',
				totalOrders: { $sum: 1 },
				totalRevenue: { $sum: '$totalAmount' },
				avgOrderValue: { $avg: '$totalAmount' },
			},
		},
		{
			$project: {
				city: '$_id',
				totalOrders: 1,
				totalRevenue: 1,
				avgOrderValue: { $round: ['$avgOrderValue', 2] },
				_id: 0,
			},
		},
		{ $sort: { totalOrders: -1 } },
		{ $limit: parseInt(limit) },
	]);

	// Calculate total for percentage calculation
	const totalOrders = ordersByLocation.reduce(
		(sum, item) => sum + item.totalOrders,
		0
	);

	const formattedData = ordersByLocation.map((item) => ({
		city: item.city,
		totalOrders: item.totalOrders,
		totalRevenue: item.totalRevenue,
		avgOrderValue: item.avgOrderValue,
		percentage: ((item.totalOrders / totalOrders) * 100).toFixed(1),
	}));

	res.json({
		success: true,
		data: formattedData,
	});
});

exports.getTopCustomers = catchAsync(async (req, res) => {
	const { period = '6months', limit = 10 } = req.query;
	const { startDate, endDate } = getDateRange(period);

	const topCustomers = await Order.aggregate([
		{
			$match: {
				createdAt: { $gte: startDate, $lte: endDate },
				status: { $ne: 'cancelled' },
			},
		},
		{
			$group: {
				_id: '$user',
				totalOrders: { $sum: 1 },
				totalSpent: { $sum: '$totalAmount' },
				avgOrderValue: { $avg: '$totalAmount' },
				lastOrderDate: { $max: '$createdAt' },
			},
		},
		{
			$lookup: {
				from: 'users',
				localField: '_id',
				foreignField: '_id',
				as: 'userInfo',
			},
		},
		{
			$unwind: '$userInfo',
		},
		{
			$project: {
				customerId: '$_id',
				customerName: '$userInfo.fullName',
				email: '$userInfo.email',
				totalOrders: 1,
				totalSpent: 1,
				avgOrderValue: { $round: ['$avgOrderValue', 2] },
				lastOrderDate: 1,
				// Calculate customer lifetime value (LTV) - simplified as total spent
				ltv: '$totalSpent',
				_id: 0,
			},
		},
		{ $sort: { totalSpent: -1 } },
		{ $limit: parseInt(limit) },
	]);

	// Add additional customer insights
	const enrichedCustomers = topCustomers.map((customer, index) => ({
		...customer,
		rank: index + 1,
		// Calculate days since last order
		daysSinceLastOrder: Math.floor(
			(new Date() - new Date(customer.lastOrderDate)) / (1000 * 60 * 60 * 24)
		),
		// Customer segment based on spending
		segment:
			customer.totalSpent >= 5000
				? 'VIP'
				: customer.totalSpent >= 2000
				? 'Premium'
				: customer.totalSpent >= 500
				? 'Regular'
				: 'New',
	}));

	res.json({
		success: true,
		data: enrichedCustomers,
	});
});

exports.getCategoryPerformance = catchAsync(async (req, res) => {
	const { period = '6months' } = req.query;
	const { startDate, endDate } = getDateRange(period);

	const categoryPerformance = await Order.aggregate([
		{
			$match: {
				createdAt: { $gte: startDate, $lte: endDate },
				status: { $ne: 'cancelled' },
			},
		},
		{ $unwind: '$items' },
		{
			$lookup: {
				from: 'products',
				localField: 'items.product',
				foreignField: '_id',
				as: 'productInfo',
			},
		},
		{ $unwind: '$productInfo' },
		{
			$lookup: {
				from: 'subcategories',
				localField: 'productInfo.category',
				foreignField: '_id',
				as: 'subcategoryInfo',
			},
		},
		{ $unwind: '$subcategoryInfo' },
		{
			$lookup: {
				from: 'categories',
				localField: 'subcategoryInfo.parentCategory',
				foreignField: '_id',
				as: 'categoryInfo',
			},
		},
		{ $unwind: '$categoryInfo' },
		{
			$group: {
				_id: {
					categoryId: '$categoryInfo._id',
					categoryName: '$categoryInfo.name',
				},
				totalRevenue: {
					$sum: { $multiply: ['$items.price', '$items.quantity'] },
				},
				totalQuantity: { $sum: '$items.quantity' },
				totalOrders: { $sum: 1 },
				totalImportCost: {
					$sum: { $multiply: ['$items.importPrice', '$items.quantity'] },
				},
			},
		},
		{
			$addFields: {
				profit: { $subtract: ['$totalRevenue', '$totalImportCost'] },
				avgOrderValue: { $divide: ['$totalRevenue', '$totalOrders'] },
			},
		},
		{
			$project: {
				categoryName: '$_id.categoryName',
				totalRevenue: 1,
				profit: 1,
				totalQuantity: 1,
				totalOrders: 1,
				avgOrderValue: { $round: ['$avgOrderValue', 2] },
				_id: 0,
			},
		},
		{ $sort: { totalRevenue: -1 } },
	]);

	res.json({
		success: true,
		data: categoryPerformance,
	});
});

exports.getProfitMarginsByCategory = catchAsync(async (req, res) => {
	const { period = '6months' } = req.query;
	const { startDate, endDate } = getDateRange(period);

	const profitMargins = await Order.aggregate([
		{
			$match: {
				createdAt: { $gte: startDate, $lte: endDate },
				status: { $ne: 'cancelled' },
			},
		},
		{ $unwind: '$items' },
		{
			$lookup: {
				from: 'products',
				localField: 'items.product',
				foreignField: '_id',
				as: 'productInfo',
			},
		},
		{ $unwind: '$productInfo' },
		{
			$lookup: {
				from: 'subcategories',
				localField: 'productInfo.category',
				foreignField: '_id',
				as: 'subcategoryInfo',
			},
		},
		{ $unwind: '$subcategoryInfo' },
		{
			$lookup: {
				from: 'categories',
				localField: 'subcategoryInfo.parentCategory',
				foreignField: '_id',
				as: 'categoryInfo',
			},
		},
		{ $unwind: '$categoryInfo' },
		{
			$group: {
				_id: {
					categoryId: '$categoryInfo._id',
					categoryName: '$categoryInfo.name',
				},
				totalRevenue: {
					$sum: { $multiply: ['$items.price', '$items.quantity'] },
				},
				totalImportCost: {
					$sum: { $multiply: ['$items.importPrice', '$items.quantity'] },
				},
			},
		},
		{
			$addFields: {
				profit: { $subtract: ['$totalRevenue', '$totalImportCost'] },
				profitMargin: {
					$cond: {
						if: { $gt: ['$totalRevenue', 0] },
						then: {
							$multiply: [
								{
									$divide: [
										{ $subtract: ['$totalRevenue', '$totalImportCost'] },
										'$totalRevenue',
									],
								},
								100,
							],
						},
						else: 0,
					},
				},
			},
		},
		{
			$project: {
				categoryName: '$_id.categoryName',
				totalRevenue: 1,
				totalImportCost: 1,
				profit: 1,
				profitMargin: { $round: ['$profitMargin', 1] },
				_id: 0,
			},
		},
		{ $sort: { profitMargin: -1 } },
	]);

	res.json({
		success: true,
		data: profitMargins,
	});
});

exports.getEcommerceMetrics = catchAsync(async (req, res) => {
	const { period = '6months' } = req.query;
	const { startDate, endDate } = getDateRange(period);

	// Get previous period for comparison
	const periodDiff = endDate.getTime() - startDate.getTime();
	const prevStartDate = new Date(startDate.getTime() - periodDiff);
	const prevEndDate = startDate;

	const [currentMetrics, previousMetrics] = await Promise.all([
		// Current period metrics
		Order.aggregate([
			{
				$match: {
					createdAt: { $gte: startDate, $lte: endDate },
					status: { $ne: 'cancelled' },
				},
			},
			{
				$group: {
					_id: null,
					totalRevenue: { $sum: '$totalAmount' },
					totalOrders: { $sum: 1 },
					uniqueCustomers: { $addToSet: '$user' },
				},
			},
			{
				$addFields: {
					avgOrderValue: { $divide: ['$totalRevenue', '$totalOrders'] },
					uniqueCustomerCount: { $size: '$uniqueCustomers' },
				},
			},
		]),

		// Previous period metrics
		Order.aggregate([
			{
				$match: {
					createdAt: { $gte: prevStartDate, $lte: prevEndDate },
					status: { $ne: 'cancelled' },
				},
			},
			{
				$group: {
					_id: null,
					totalRevenue: { $sum: '$totalAmount' },
					totalOrders: { $sum: 1 },
					uniqueCustomers: { $addToSet: '$user' },
				},
			},
			{
				$addFields: {
					avgOrderValue: { $divide: ['$totalRevenue', '$totalOrders'] },
					uniqueCustomerCount: { $size: '$uniqueCustomers' },
				},
			},
		]),
	]);

	const current = currentMetrics[0] || {
		avgOrderValue: 0,
		uniqueCustomerCount: 0,
		totalOrders: 0,
	};
	const previous = previousMetrics[0] || {
		avgOrderValue: 0,
		uniqueCustomerCount: 0,
		totalOrders: 0,
	};

	// Calculate percentage changes
	const aovChange =
		previous.avgOrderValue > 0
			? (
					((current.avgOrderValue - previous.avgOrderValue) /
						previous.avgOrderValue) *
					100
			  ).toFixed(1)
			: 0;

	// Mock conversion rate calculation (you'd need to track website sessions/visitors)
	// This is a simplified version - in reality, you'd track sessions from analytics
	const mockConversionRate = 3.2; // You'd calculate: (orders / website_sessions) * 100
	const mockPreviousConversionRate = 2.4;
	const conversionChange = (
		((mockConversionRate - mockPreviousConversionRate) /
			mockPreviousConversionRate) *
		100
	).toFixed(1);

	// Mock cart abandonment rate (you'd need to track cart creation vs completion)
	// This would require tracking cart creation events
	const mockCartAbandonmentRate = 68.5; // You'd calculate: (abandoned_carts / total_carts_created) * 100
	const mockPreviousCartAbandonmentRate = 70.6;
	const cartAbandonmentChange = (
		((mockCartAbandonmentRate - mockPreviousCartAbandonmentRate) /
			mockPreviousCartAbandonmentRate) *
		100
	).toFixed(1);

	res.json({
		success: true,
		data: {
			avgOrderValue: {
				value: current.avgOrderValue,
				change: parseFloat(aovChange),
				formatted: `$${current.avgOrderValue.toFixed(2)}`,
			},
			conversionRate: {
				value: mockConversionRate,
				change: parseFloat(conversionChange),
				formatted: `${mockConversionRate}%`,
			},
			cartAbandonment: {
				value: mockCartAbandonmentRate,
				change: parseFloat(cartAbandonmentChange),
				formatted: `${mockCartAbandonmentRate}%`,
			},
		},
	});
});

exports.getProductRevenuePerformance = catchAsync(async (req, res) => {
	const { period = '6months', limit = 10 } = req.query;
	const { startDate, endDate } = getDateRange(period);

	const productPerformance = await Order.aggregate([
		{
			$match: {
				createdAt: { $gte: startDate, $lte: endDate },
				status: { $ne: 'cancelled' },
			},
		},
		{ $unwind: '$items' },
		{
			$group: {
				_id: {
					productId: '$items.product',
					productName: '$items.name',
				},
				totalRevenue: {
					$sum: { $multiply: ['$items.price', '$items.quantity'] },
				},
				totalQuantity: { $sum: '$items.quantity' },
				totalOrders: { $sum: 1 },
				totalImportCost: {
					$sum: { $multiply: ['$items.importPrice', '$items.quantity'] },
				},
			},
		},
		{
			$lookup: {
				from: 'products',
				localField: '_id.productId',
				foreignField: '_id',
				as: 'productInfo',
			},
		},
		{
			$addFields: {
				productInfo: { $arrayElemAt: ['$productInfo', 0] },
				profit: { $subtract: ['$totalRevenue', '$totalImportCost'] },
				avgOrderValue: { $divide: ['$totalRevenue', '$totalOrders'] },
			},
		},
		{
			$addFields: {
				profitMargin: {
					$cond: {
						if: { $gt: ['$totalRevenue', 0] },
						then: {
							$multiply: [{ $divide: ['$profit', '$totalRevenue'] }, 100],
						},
						else: 0,
					},
				},
			},
		},
		{
			$project: {
				productName: '$_id.productName',
				totalRevenue: 1,
				profit: 1,
				profitMargin: { $round: ['$profitMargin', 1] },
				totalQuantity: 1,
				totalOrders: 1,
				avgOrderValue: { $round: ['$avgOrderValue', 2] },
				averageRating: '$productInfo.averageRating',
				totalReviews: '$productInfo.totalReviews',
				_id: 0,
			},
		},
		{ $sort: { totalRevenue: -1 } },
		{ $limit: parseInt(limit) },
	]);

	res.json({
		success: true,
		data: productPerformance,
	});
});

exports.getProductRatingsDistribution = catchAsync(async (req, res) => {
	const ratingsDistribution = await Product.aggregate([
		{
			$match: {
				active: true,
				totalReviews: { $gt: 0 }, // Only products with reviews
			},
		},
		{
			$addFields: {
				ratingRange: {
					$switch: {
						branches: [
							{ case: { $gte: ['$averageRating', 4.5] }, then: 5 },
							{ case: { $gte: ['$averageRating', 3.5] }, then: 4 },
							{ case: { $gte: ['$averageRating', 2.5] }, then: 3 },
							{ case: { $gte: ['$averageRating', 1.5] }, then: 2 },
						],
						default: 1,
					},
				},
			},
		},
		{
			$group: {
				_id: '$ratingRange',
				count: { $sum: 1 },
				totalProducts: { $sum: 1 },
				avgRating: { $avg: '$averageRating' },
				totalReviews: { $sum: '$totalReviews' },
			},
		},
		{
			$project: {
				rating: '$_id',
				count: 1,
				avgRating: { $round: ['$avgRating', 1] },
				totalReviews: 1,
				_id: 0,
			},
		},
		{ $sort: { rating: -1 } },
	]);

	// Calculate total for percentage
	const totalProducts = ratingsDistribution.reduce(
		(sum, item) => sum + item.count,
		0
	);

	// Ensure all rating levels are represented (1-5 stars)
	const completeDistribution = [5, 4, 3, 2, 1].map((rating) => {
		const existing = ratingsDistribution.find((item) => item.rating === rating);
		return {
			rating,
			count: existing ? existing.count : 0,
			totalReviews: existing ? existing.totalReviews : 0,
			avgRating: existing ? existing.avgRating : 0,
			percentage:
				totalProducts > 0
					? (((existing ? existing.count : 0) / totalProducts) * 100).toFixed(1)
					: 0,
		};
	});

	res.json({
		success: true,
		data: {
			distribution: completeDistribution,
			totalProducts,
			summary: {
				excellentProducts:
					completeDistribution.find((r) => r.rating === 5)?.count || 0, // 5 stars
				goodProducts: completeDistribution.find((r) => r.rating === 4)?.count || 0, // 4 stars
				needsImprovement: completeDistribution
					.filter((r) => r.rating <= 3)
					.reduce((sum, r) => sum + r.count, 0), // 3 stars or below
			},
		},
	});
});

exports.getWishlistToPurchaseConversion = catchAsync(async (req, res) => {
	const { period = '6months' } = req.query;
	const { startDate, endDate } = getDateRange(period);

	// Get wishlist items created in the period
	const wishlistAnalysis = await Wishlist.aggregate([
		{
			$match: {
				createdAt: { $gte: startDate, $lte: endDate },
			},
		},
		{
			$lookup: {
				from: 'orders',
				let: { userId: '$user', productId: '$product' },
				pipeline: [
					{
						$match: {
							$expr: { $eq: ['$user', '$$userId'] },
							createdAt: { $gte: startDate, $lte: endDate },
							status: { $ne: 'cancelled' },
						},
					},
					{ $unwind: '$items' },
					{
						$match: {
							$expr: { $eq: ['$items.product', '$$productId'] },
						},
					},
					{
						$project: {
							orderId: '$_id',
							orderDate: '$createdAt',
							itemPrice: '$items.price',
							itemQuantity: '$items.quantity',
						},
					},
				],
				as: 'purchases',
			},
		},
		{
			$addFields: {
				isPurchased: { $gt: [{ $size: '$purchases' }, 0] },
				purchaseDate: { $arrayElemAt: ['$purchases.orderDate', 0] },
				daysToPurchase: {
					$cond: {
						if: { $gt: [{ $size: '$purchases' }, 0] },
						then: {
							$divide: [
								{
									$subtract: [
										{ $arrayElemAt: ['$purchases.orderDate', 0] },
										'$createdAt',
									],
								},
								1000 * 60 * 60 * 24, // Convert to days
							],
						},
						else: null,
					},
				},
			},
		},
		{
			$group: {
				_id: null,
				totalWishlisted: { $sum: 1 },
				totalPurchased: {
					$sum: { $cond: ['$isPurchased', 1, 0] },
				},
				avgDaysToPurchase: {
					$avg: {
						$cond: [
							{ $and: ['$isPurchased', { $ne: ['$daysToPurchase', null] }] },
							'$daysToPurchase',
							null,
						],
					},
				},
				purchasedItems: {
					$push: {
						$cond: [
							'$isPurchased',
							{
								user: '$user',
								product: '$product',
								wishlistDate: '$createdAt',
								purchaseDate: '$purchaseDate',
								daysToPurchase: '$daysToPurchase',
							},
							null,
						],
					},
				},
			},
		},
		{
			$addFields: {
				conversionRate: {
					$cond: {
						if: { $gt: ['$totalWishlisted', 0] },
						then: {
							$multiply: [{ $divide: ['$totalPurchased', '$totalWishlisted'] }, 100],
						},
						else: 0,
					},
				},
				purchasedItems: {
					$filter: {
						input: '$purchasedItems',
						cond: { $ne: ['$$this', null] },
					},
				},
			},
		},
	]);

	// Get top wishlisted products (most added to wishlist)
	const topWishlistedProducts = await Wishlist.aggregate([
		{
			$match: {
				createdAt: { $gte: startDate, $lte: endDate },
			},
		},
		{
			$group: {
				_id: '$product',
				wishlistCount: { $sum: 1 },
			},
		},
		{
			$lookup: {
				from: 'products',
				localField: '_id',
				foreignField: '_id',
				as: 'productInfo',
			},
		},
		{
			$unwind: '$productInfo',
		},
		{
			$project: {
				productName: '$productInfo.name',
				wishlistCount: 1,
				price: '$productInfo.price',
				averageRating: '$productInfo.averageRating',
				_id: 0,
			},
		},
		{ $sort: { wishlistCount: -1 } },
		{ $limit: 5 },
	]);

	// Get wishlist conversion by product
	const productConversionRates = await Wishlist.aggregate([
		{
			$match: {
				createdAt: { $gte: startDate, $lte: endDate },
			},
		},
		{
			$lookup: {
				from: 'orders',
				let: { userId: '$user', productId: '$product' },
				pipeline: [
					{
						$match: {
							$expr: { $eq: ['$user', '$$userId'] },
							createdAt: { $gte: startDate },
							status: { $ne: 'cancelled' },
						},
					},
					{ $unwind: '$items' },
					{
						$match: {
							$expr: { $eq: ['$items.product', '$$productId'] },
						},
					},
				],
				as: 'purchases',
			},
		},
		{
			$group: {
				_id: '$product',
				totalWishlisted: { $sum: 1 },
				totalPurchased: {
					$sum: { $cond: [{ $gt: [{ $size: '$purchases' }, 0] }, 1, 0] },
				},
			},
		},
		{
			$addFields: {
				conversionRate: {
					$cond: {
						if: { $gt: ['$totalWishlisted', 0] },
						then: {
							$multiply: [{ $divide: ['$totalPurchased', '$totalWishlisted'] }, 100],
						},
						else: 0,
					},
				},
			},
		},
		{
			$lookup: {
				from: 'products',
				localField: '_id',
				foreignField: '_id',
				as: 'productInfo',
			},
		},
		{
			$unwind: '$productInfo',
		},
		{
			$project: {
				productName: '$productInfo.name',
				totalWishlisted: 1,
				totalPurchased: 1,
				conversionRate: { $round: ['$conversionRate', 1] },
				_id: 0,
			},
		},
		{ $sort: { conversionRate: -1 } },
		{ $limit: 5 },
	]);

	const result = wishlistAnalysis[0] || {
		totalWishlisted: 0,
		totalPurchased: 0,
		conversionRate: 0,
		avgDaysToPurchase: 0,
	};

	res.json({
		success: true,
		data: {
			summary: {
				totalWishlisted: result.totalWishlisted,
				totalPurchased: result.totalPurchased,
				conversionRate: parseFloat(result.conversionRate.toFixed(1)),
				avgDaysToPurchase: Math.round(result.avgDaysToPurchase || 0),
			},
			topWishlistedProducts,
			productConversionRates,
			period,
		},
	});
});

exports.getInventoryMetrics = catchAsync(async (req, res, next) => {
	const { period = '6months' } = req.query;
	const { startDate, endDate } = getDateRange(period);

	// Calculate inventory metrics
	const [inventoryMetrics, salesData, deadStockProducts] = await Promise.all([
		// 1. Calculate total inventory value and low stock items
		Product.aggregate([
			{
				$match: {
					active: true,
					inStock: true,
				},
			},
			{
				$addFields: {
					// Calculate total inventory for each product across all variants
					totalInventory: {
						$reduce: {
							input: '$variants',
							initialValue: 0,
							in: { $add: ['$$value', '$$this.inventory'] },
						},
					},
					// Calculate total value for each product
					totalValue: {
						$reduce: {
							input: '$variants',
							initialValue: 0,
							in: {
								$add: ['$$value', { $multiply: ['$$this.inventory', '$importPrice'] }],
							},
						},
					},
					// Check if product is low stock (less than 10 total inventory)
					isLowStock: {
						$lt: [
							{
								$reduce: {
									input: '$variants',
									initialValue: 0,
									in: { $add: ['$$value', '$$this.inventory'] },
								},
							},
							10,
						],
					},
				},
			},
			{
				$group: {
					_id: null,
					totalInventoryValue: { $sum: '$totalValue' },
					lowStockCount: {
						$sum: { $cond: ['$isLowStock', 1, 0] },
					},
					totalProducts: { $sum: 1 },
					totalInventoryUnits: { $sum: '$totalInventory' },
				},
			},
		]),

		// 2. Calculate sales data for turnover analysis
		Order.aggregate([
			{
				$match: {
					createdAt: { $gte: startDate, $lte: endDate },
					status: { $ne: 'cancelled' },
				},
			},
			{ $unwind: '$items' },
			{
				$group: {
					_id: '$items.product',
					totalSold: { $sum: '$items.quantity' },
					totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
					totalCost: {
						$sum: { $multiply: ['$items.importPrice', '$items.quantity'] },
					},
				},
			},
			{
				$lookup: {
					from: 'products',
					localField: '_id',
					foreignField: '_id',
					as: 'product',
				},
			},
			{ $unwind: '$product' },
			{
				$addFields: {
					avgInventory: {
						$divide: [
							{
								$reduce: {
									input: '$product.variants',
									initialValue: 0,
									in: { $add: ['$$value', '$$this.inventory'] },
								},
							},
							2, // Simplified average inventory calculation
						],
					},
				},
			},
			{
				$addFields: {
					turnoverRate: {
						$cond: {
							if: { $gt: ['$avgInventory', 0] },
							then: { $divide: ['$totalSold', '$avgInventory'] },
							else: 0,
						},
					},
				},
			},
			{
				$group: {
					_id: null,
					avgTurnoverRate: { $avg: '$turnoverRate' },
					totalSoldUnits: { $sum: '$totalSold' },
					totalRevenue: { $sum: '$totalRevenue' },
				},
			},
		]),

		// 3. Find dead stock products (no sales in the period and high inventory)
		Product.aggregate([
			{
				$match: {
					active: true,
					inStock: true,
				},
			},
			{
				$lookup: {
					from: 'orders',
					let: { productId: '$_id' },
					pipeline: [
						{
							$match: {
								createdAt: { $gte: startDate, $lte: endDate },
								status: { $ne: 'cancelled' },
							},
						},
						{ $unwind: '$items' },
						{
							$match: {
								$expr: { $eq: ['$items.product', '$$productId'] },
							},
						},
						{ $count: 'salesCount' },
					],
					as: 'sales',
				},
			},
			{
				$addFields: {
					totalInventory: {
						$reduce: {
							input: '$variants',
							initialValue: 0,
							in: { $add: ['$$value', '$$this.inventory'] },
						},
					},
					hasSales: { $gt: [{ $size: '$sales' }, 0] },
				},
			},
			{
				$match: {
					hasSales: false,
					totalInventory: { $gt: 5 }, // Products with inventory > 5 and no sales
				},
			},
			{
				$count: 'deadStockCount',
			},
		]),
	]);

	// Process results
	const metrics = inventoryMetrics[0] || {
		totalInventoryValue: 0,
		lowStockCount: 0,
		totalProducts: 0,
		totalInventoryUnits: 0,
	};

	const sales = salesData[0] || {
		avgTurnoverRate: 0,
		totalSoldUnits: 0,
		totalRevenue: 0,
	};

	const deadStock = deadStockProducts[0] || { deadStockCount: 0 };

	// Calculate stock turnover rate
	const stockTurnover = sales.avgTurnoverRate || 0;

	res.json({
		success: true,
		data: {
			totalInventoryValue: {
				value: metrics.totalInventoryValue,
				formatted: `$${metrics.totalInventoryValue.toLocaleString()}`,
			},
			lowStockItems: {
				value: metrics.lowStockCount,
				percentage:
					metrics.totalProducts > 0
						? ((metrics.lowStockCount / metrics.totalProducts) * 100).toFixed(1)
						: 0,
			},
			stockTurnover: {
				value: parseFloat(stockTurnover.toFixed(1)),
				formatted: `${stockTurnover.toFixed(1)}x`,
			},
			deadStock: {
				value: deadStock.deadStockCount,
				percentage:
					metrics.totalProducts > 0
						? ((deadStock.deadStockCount / metrics.totalProducts) * 100).toFixed(1)
						: 0,
			},
			summary: {
				totalProducts: metrics.totalProducts,
				totalInventoryUnits: metrics.totalInventoryUnits,
				period: period,
			},
		},
	});
});

exports.getInventoryStatus = catchAsync(async (req, res, next) => {
	// Create base query for products with variants
	let query = Product.find({
		active: true,
		$expr: { $gt: [{ $size: '$variants' }, 0] }, // Only products with variants
	});

	// Handle search functionality
	const searchableQuery = { ...req.query };

	// Custom search for inventory management
	if (req.query.inventorySearch) {
		const searchRegex = new RegExp(req.query.inventorySearch, 'i');
		query = query.find({
			$or: [{ name: searchRegex }, { 'variants.sku': searchRegex }],
		});
		delete searchableQuery.inventorySearch;
	}

	// Filter by stock status
	if (req.query.stockStatus) {
		switch (req.query.stockStatus) {
			case 'low':
				query = query.find({
					$expr: {
						$lt: [
							{
								$reduce: {
									input: '$variants',
									initialValue: 0,
									in: { $add: ['$$value', '$$this.inventory'] },
								},
							},
							10, // Low stock threshold
						],
					},
				});
				break;
			case 'out':
				query = query.find({
					$expr: {
						$eq: [
							{
								$reduce: {
									input: '$variants',
									initialValue: 0,
									in: { $add: ['$$value', '$$this.inventory'] },
								},
							},
							0,
						],
					},
				});
				break;
			case 'available':
				query = query.find({
					$expr: {
						$gte: [
							{
								$reduce: {
									input: '$variants',
									initialValue: 0,
									in: { $add: ['$$value', '$$this.inventory'] },
								},
							},
							10,
						],
					},
				});
				break;
		}
		delete searchableQuery.stockStatus;
	}

	// Apply API Features for additional filtering, sorting, and pagination
	const features = new apiFeatures(query, searchableQuery);
	await features.filter();
	features.sort();
	features.limitFields();

	// Get pagination info
	const paginationInfo = await features.paginate();

	// Execute query with population
	const products = await features.query
		.populate('brand', 'name')
		.populate('category', 'name')
		.lean();

	// Process products to add inventory calculations
	const processedProducts = products.map((product) => {
		// Calculate total inventory across all variants
		const totalInventory = product.variants.reduce(
			(sum, variant) => sum + (variant.inventory || 0),
			0
		);

		// Calculate reserved inventory
		const totalReserved = product.variants.reduce(
			(sum, variant) => sum + (variant.reservedInventory || 0),
			0
		);

		// Calculate available inventory
		const availableInventory = totalInventory - totalReserved;

		// Determine stock status
		let stockStatus = 'available';
		let stockBadge = 'In Stock';

		if (totalInventory === 0) {
			stockStatus = 'out';
			stockBadge = 'Out of Stock';
		} else if (availableInventory <= 5) {
			stockStatus = 'critical';
			stockBadge = 'Critical Stock';
		} else if (availableInventory <= 10) {
			stockStatus = 'low';
			stockBadge = 'Low Stock';
		}

		// Calculate inventory value
		const inventoryValue = product.variants.reduce(
			(sum, variant) => sum + variant.inventory * (product.importPrice || 0),
			0
		);

		return {
			_id: product._id,
			name: product.name,
			brand: product.brand?.name || 'No Brand',
			category: product.category?.name || 'No Category',
			totalInventory,
			availableInventory,
			totalReserved,
			stockStatus,
			stockBadge,
			inventoryValue,
			price: product.price,
			importPrice: product.importPrice,
			variants: product.variants.map((variant) => ({
				sku: variant.sku,
				color: variant.color,
				size: variant.size,
				inventory: variant.inventory,
				reservedInventory: variant.reservedInventory || 0,
				available: variant.inventory - (variant.reservedInventory || 0),
				price: variant.price,
			})),
			images: product.images,
			updatedAt: product.updatedAt,
		};
	});

	// Sort by stock status (critical and low stock first)
	processedProducts.sort((a, b) => {
		const statusOrder = { critical: 0, low: 1, available: 2, out: 3 };
		return statusOrder[a.stockStatus] - statusOrder[b.stockStatus];
	});

	res.json({
		success: true,
		results: processedProducts.length,
		data: processedProducts,
		pagination: {
			...paginationInfo,
			nextPage: paginationInfo.nextPage
				? `${process.env.BASE_URL}/api/v1/analytics${paginationInfo.nextPage}`
				: null,
			prevPage: paginationInfo.prevPage
				? `${process.env.BASE_URL}/api/v1/analytics${paginationInfo.prevPage}`
				: null,
		},
	});
});
