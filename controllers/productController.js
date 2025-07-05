const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Subcategory = require('../models/subcategoryModel');
const Brand = require('../models/brandModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const handlerFactory = require('./handlerFactory');
const apiFeatures = require('../utils/apiFeatures');

// Helper function to get available filters from products
const getAvailableFilters = async (baseQuery) => {
	const pipeline = [
		{ $match: baseQuery },
		{
			$lookup: {
				from: 'brands',
				localField: 'brand',
				foreignField: '_id',
				as: 'brandInfo',
			},
		},
		{
			$lookup: {
				from: 'subcategories',
				localField: 'category',
				foreignField: '_id',
				as: 'subcategoryInfo',
			},
		},
		{
			$unwind: {
				path: '$variants',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$group: {
				_id: null,
				brands: {
					$addToSet: {
						_id: { $arrayElemAt: ['$brandInfo._id', 0] },
						name: { $arrayElemAt: ['$brandInfo.name', 0] },
						logo: { $arrayElemAt: ['$brandInfo.logo', 0] },
					},
				},
				subcategories: {
					$addToSet: {
						_id: { $arrayElemAt: ['$subcategoryInfo._id', 0] },
						name: { $arrayElemAt: ['$subcategoryInfo.name', 0] },
						slug: { $arrayElemAt: ['$subcategoryInfo.slug', 0] },
					},
				},
				colors: { $addToSet: '$variants.color' },
				sizes: { $addToSet: '$variants.size' },
				genders: { $addToSet: '$gender' },
				seasons: { $addToSet: '$season' },
				materials: { $addToSet: { $arrayElemAt: ['$material', 0] } },
				priceRange: {
					$push: {
						min: { $min: ['$price', '$salePrice'] },
						max: { $max: ['$price', '$salePrice'] },
					},
				},
				// totalProducts: { $sum: 1 },
			},
		},
		{
			$project: {
				_id: 0,
				brands: {
					$filter: {
						input: '$brands',
						cond: { $ne: ['$$this.name', null] },
					},
				},
				subcategories: {
					$filter: {
						input: '$subcategories',
						cond: { $ne: ['$$this.name', null] },
					},
				},
				colors: {
					$filter: {
						input: '$colors',
						cond: { $ne: ['$$this', null] },
					},
				},
				sizes: {
					$filter: {
						input: '$sizes',
						cond: { $ne: ['$$this', null] },
					},
				},
				genders: {
					$filter: {
						input: '$genders',
						cond: { $ne: ['$$this', null] },
					},
				},
				seasons: {
					$filter: {
						input: '$seasons',
						cond: { $ne: ['$$this', null] },
					},
				},
				materials: {
					$filter: {
						input: '$materials',
						cond: { $ne: ['$$this', null] },
					},
				},
				minPrice: { $min: '$priceRange.min' },
				maxPrice: { $max: '$priceRange.max' },
			},
		},
	];

	const result = await Product.aggregate(pipeline);
	return (
		result[0] || {
			brands: [],
			subcategories: [],
			colors: [],
			sizes: [],
			genders: [],
			seasons: [],
			materials: [],
			minPrice: 0,
			maxPrice: 0,
			totalProducts: 0,
		}
	);
};

// Helper function to build product query from filters
const buildProductQuery = (baseQuery, filters) => {
	const query = { ...baseQuery };

	if (filters.brands && filters.brands.length > 0) {
		query.brand = { $in: filters.brands };
	}

	if (filters.subcategories && filters.subcategories.length > 0) {
		query.category = { $in: filters.subcategories };
	}

	if (filters.colors && filters.colors.length > 0) {
		query['variants.color'] = { $in: filters.colors };
	}

	if (filters.sizes && filters.sizes.length > 0) {
		query['variants.size'] = { $in: filters.sizes };
	}

	if (filters.genders && filters.genders.length > 0) {
		query.gender = { $in: filters.genders };
	}

	if (filters.seasons && filters.seasons.length > 0) {
		query.season = { $in: filters.seasons };
	}

	if (filters.materials && filters.materials.length > 0) {
		query.material = { $in: filters.materials };
	}

	if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
		query.$or = [];
		const priceCondition = {};
		const salePriceCondition = {};

		if (filters.minPrice !== undefined) {
			priceCondition.$gte = Number(filters.minPrice);
			salePriceCondition.$gte = Number(filters.minPrice);
		}
		if (filters.maxPrice !== undefined) {
			priceCondition.$lte = Number(filters.maxPrice);
			salePriceCondition.$lte = Number(filters.maxPrice);
		}

		query.$or.push({ price: priceCondition });
		query.$or.push({ salePrice: salePriceCondition });
	}

	if (filters.inStock === 'true') {
		query.inStock = true;
	}

	if (filters.featured === 'true') {
		query.featuredProduct = true;
	}

	return query;
};

// Helper function to parse filters from query parameters
const parseFilters = (queryParams) => {
	const filters = {};

	if (queryParams.brands) {
		filters.brands = Array.isArray(queryParams.brands)
			? queryParams.brands
			: queryParams.brands.split(',');
	}

	if (queryParams.subcategories) {
		filters.subcategories = Array.isArray(queryParams.subcategories)
			? queryParams.subcategories
			: queryParams.subcategories.split(',');
	}

	if (queryParams.colors) {
		filters.colors = Array.isArray(queryParams.colors)
			? queryParams.colors
			: queryParams.colors.split(',');
	}

	if (queryParams.sizes) {
		filters.sizes = Array.isArray(queryParams.sizes)
			? queryParams.sizes
			: queryParams.sizes.split(',');
	}

	if (queryParams.genders) {
		filters.genders = Array.isArray(queryParams.genders)
			? queryParams.genders
			: queryParams.genders.split(',');
	}

	if (queryParams.seasons) {
		filters.seasons = Array.isArray(queryParams.seasons)
			? queryParams.seasons
			: queryParams.seasons.split(',');
	}

	if (queryParams.materials) {
		filters.materials = Array.isArray(queryParams.materials)
			? queryParams.materials
			: queryParams.materials.split(',');
	}

	if (queryParams.minPrice) {
		filters.minPrice = Number(queryParams.minPrice);
	}

	if (queryParams.maxPrice) {
		filters.maxPrice = Number(queryParams.maxPrice);
	}

	if (queryParams.inStock) {
		filters.inStock = queryParams.inStock;
	}

	if (queryParams.featured) {
		filters.featured = queryParams.featured;
	}

	return filters;
};

// Middleware to get products by category with dynamic filters
exports.getProductsByCategory = catchAsync(async (req, res, next) => {
	const { categorySlug } = req.params;

	// Find category by slug
	const category = await Category.findOne({
		slug: categorySlug,
		active: true,
	}).populate({
		path: 'subcategories',
		match: { active: true },
		select: '_id name slug',
	});

	if (!category) {
		return next(new AppError('Category not found', 404));
	}

	// Get all subcategory IDs for this category
	const subcategoryIds = category.subcategories.map((sub) => sub._id);

	// Base query for products in this category
	const baseQuery = {
		category: { $in: subcategoryIds },
		active: true,
	};

	// Parse filters from query parameters
	const appliedFilters = parseFilters(req.query);
	// console.log('Applied Filters:', appliedFilters);

	// Build final query with filters
	const productQuery = buildProductQuery(baseQuery, appliedFilters);
	// console.log('Product Query:', productQuery);

	// Get available filters based on base query (without applied filters)
	const availableFilters = await getAvailableFilters(baseQuery);

	const query = Product.find(productQuery);
	const features = new apiFeatures(query, req.query).sort().limitFields();
	const paginationInfo = await features.paginate();

	const products = await features.query.populate([
		{ path: 'category', select: 'name slug parentCategory' },
		{ path: 'brand', select: 'name logo' },
	]);

	// Attach data to request object
	req.categoryData = {
		category,
		products,
		filters: {
			available: availableFilters,
			applied: appliedFilters,
		},
		pagination: {
			...paginationInfo,
			nextPage: paginationInfo.nextPage
				? `${process.env.BASE_URL}/api/v1/products${paginationInfo.nextPage}`
				: null,
			prevPage: paginationInfo.prevPage
				? `${process.env.BASE_URL}/api/v1/products${paginationInfo.prevPage}`
				: null,
		},
	};

	next();
});

// Middleware to get products by subcategory with dynamic filters
exports.getProductsBySubcategory = catchAsync(async (req, res, next) => {
	const { categorySlug, subcategorySlug } = req.params;

	// Find category first
	const category = await Category.findOne({
		slug: categorySlug,
		active: true,
	});

	if (!category) {
		return next(new AppError('Category not found', 404));
	}

	// Find subcategory
	const subcategory = await Subcategory.findOne({
		slug: subcategorySlug,
		parentCategory: category._id,
		active: true,
	}).populate({
		path: 'parentCategory',
		select: 'name slug',
	});

	if (!subcategory) {
		return next(new AppError('Subcategory not found', 404));
	}

	// Base query for products in this subcategory
	const baseQuery = {
		category: subcategory._id,
		active: true,
	};

	// Parse filters from query parameters
	const appliedFilters = parseFilters(req.query);

	// Build final query with filters
	const productQuery = buildProductQuery(baseQuery, appliedFilters);

	// Get available filters based on base query
	const availableFilters = await getAvailableFilters(baseQuery);

	// Pagination
	const page = parseInt(req.query.page) || 1;
	const limit = parseInt(req.query.limit) || 12;
	const skip = (page - 1) * limit;

	// Sorting
	let sortBy = {};
	if (req.query.sort) {
		const sortField = req.query.sort.startsWith('-')
			? req.query.sort.slice(1)
			: req.query.sort;
		const sortOrder = req.query.sort.startsWith('-') ? -1 : 1;
		sortBy[sortField] = sortOrder;
	} else {
		sortBy = { createdAt: -1 };
	}

	// Execute query to get filtered products
	const products = await Product.find(productQuery)
		.populate([
			{ path: 'category', select: 'name slug parentCategory' },
			{ path: 'brand', select: 'name logo' },
		])
		.sort(sortBy)
		.skip(skip)
		.limit(limit);

	// Get total count for filtered products
	const totalProducts = await Product.countDocuments(productQuery);
	const totalPages = Math.ceil(totalProducts / limit);

	// Attach data to request object
	req.subcategoryData = {
		category,
		subcategory,
		products,
		filters: {
			available: availableFilters,
			applied: appliedFilters,
		},
		pagination: {
			currentPage: page,
			totalPages,
			totalProducts,
			hasNextPage: page < totalPages,
			hasPrevPage: page > 1,
			nextPage: page < totalPages ? page + 1 : null,
			prevPage: page > 1 ? page - 1 : null,
		},
	};

	next();
});

// Controller functions to send responses
exports.sendCategoryProducts = (req, res) => {
	const { category, products, filters, pagination } = req.categoryData;

	res.status(200).json({
		status: 'success',
		results: products.length,
		data: {
			category: {
				_id: category._id,
				name: category.name,
				slug: category.slug,
				subcategories: category.subcategories,
			},
			products,
			filters,
			pagination,
		},
	});
};

exports.sendSubcategoryProducts = (req, res) => {
	const { category, subcategory, products, filters, pagination } =
		req.subcategoryData;

	res.status(200).json({
		status: 'success',
		results: products.length,
		data: {
			category: {
				_id: category._id,
				name: category.name,
				slug: category.slug,
			},
			subcategory: {
				_id: subcategory._id,
				name: subcategory.name,
				slug: subcategory.slug,
			},
			products,
			filters,
			pagination,
		},
	});
};

// Management of products
exports.getProduct = handlerFactory.getOne(
	Product,
	[
		{ path: 'category', select: 'name slug' },
		{ path: 'brand', select: 'name logo' },
	],
	true
);
exports.getAllProducts = handlerFactory.getAll(Product, 'products', [
	{ path: 'category', select: 'name slug' },
	{ path: 'brand', select: 'name logo' },
]);
exports.createProduct = handlerFactory.createOne(Product);
exports.updateProduct = handlerFactory.updateOne(Product);
exports.deleteProduct = handlerFactory.deleteOne(Product);
