const AppError = require('../utils/appError');

const regexSearch = (search) => {
	return new RegExp(search, 'i');
};

class APIFeatures {
	constructor(query, queryString) {
		this.query = query;
		this.queryString = queryString;
	}

	async filter() {
		const queryObj = { ...this.queryString };

		// handle search queries
		if (queryObj.userManageSearch) {
			const regex = regexSearch(queryObj.userManageSearch);
			this.query = this.query.find({
				$or: [
					{ firstName: regex },
					{ lastName: regex },
					{ email: regex },
					{ phoneNumber: regex },
				],
			});
		}

		if (queryObj.addressManageSearch) {
			const regex = regexSearch(queryObj.addressManageSearch);
			const searchValue = queryObj.addressManageSearch;

			let userQuery = {};
			if (/^[0-9a-fA-F]{24}$/.test(queryObj.addressManageSearch)) {
				userQuery = { user: queryObj.addressManageSearch };
			}

			const $or = [
				{ city: regex },
				{ district: regex },
				{ ward: regex },
				{ addressLine: regex },
				{ name: regex },
				{ phoneNumber: regex },
			];

			// Only add user filter if it's a valid ObjectId
			if (/^[0-9a-fA-F]{24}$/.test(searchValue)) {
				$or.push({ user: searchValue });
			}

			this.query = this.query.find({ $or });
		}

		if (queryObj.orderManageSearch) {
			const regex = regexSearch(queryObj.orderManageSearch);

			// First, find users that match the search term
			const User = require('../models/userModel'); // Adjust path as needed
			const matchingUsers = await User.find({
				$or: [
					{ firstName: regex },
					{ lastName: regex },
					{
						$expr: {
							$regexMatch: {
								input: { $concat: ['$firstName', ' ', '$lastName'] },
								regex: queryObj.orderManageSearch,
								options: 'i',
							},
						},
					},
				],
			}).select('_id');

			const userIds = matchingUsers.map((user) => user._id);

			// Search orders by orderNumber or matching user IDs
			this.query = this.query.find({
				$or: [{ orderNumber: regex }, { user: { $in: userIds } }],
			});
		}

		if (queryObj.brandManageSearch) {
			const regex = regexSearch(queryObj.brandManageSearch);
			this.query = this.query.find({
				name: regex,
			});
		}

		if (queryObj.categoryManageSearch) {
			const regex = regexSearch(queryObj.categoryManageSearch);
			this.query = this.query.find({
				name: regex,
			});
		}

		if (queryObj.subcategoryManageSearch) {
			const regex = regexSearch(queryObj.subcategoryManageSearch);
			this.query = this.query.find({
				name: regex,
			});
		}

		if (queryObj.productManageSearch) {
			const regex = regexSearch(queryObj.productManageSearch);
			this.query = this.query.find({
				name: regex,
			});
		}

		// Handle payment status filtering (for order management)
		if (queryObj.paymentStatus) {
			this.query = this.query.find({
				'paymentDetails.status': queryObj.paymentStatus,
			});
		}

		// 1/ remove fields that are not part of the query
		const excludedFields = [
			'page',
			'sort',
			'limit',
			'fields',
			'userManageSearch',
			'addressManageSearch',
			'orderManageSearch',
			'brandManageSearch',
			'categoryManageSearch',
			'subcategoryManageSearch',
			'productManageSearch',
			'paymentStatus',
		];
		excludedFields.forEach((field) => delete queryObj[field]);

		// Remove empty values from queryObj
		Object.keys(queryObj).forEach(
			(key) => queryObj[key] === '' && delete queryObj[key]
		);

		// 2/ advanced filtering
		if (Object.keys(queryObj).length > 0) {
			let queryStr = JSON.stringify(queryObj);
			queryStr = queryStr.replace(
				/\b(regex|gte|gt|lte|lt)\b/g,
				(match) => `$${match}`
			);

			this.query = this.query.find(JSON.parse(queryStr));
		}
		return this;
	}

	sort() {
		if (this.queryString.sort) {
			const sortBy = this.queryString.sort.split(',').join(' ');
			this.query = this.query.sort(sortBy);
		} else {
			this.query = this.query.sort('-updatedAt _id');
		}
		return this;
	}

	limitFields() {
		if (this.queryString.fields) {
			const fields = this.queryString.fields.split(',').join(' ');
			this.query = this.query.select(fields);
		}
		this.query = this.query.select('-__v');
		return this;
	}

	async paginate() {
		const page = this.queryString.page * 1 || 1;
		const limit = this.queryString.limit * 1 || 100;
		const skip = (page - 1) * limit;

		let totalDocs;
		const Model = this.query.model;

		// Check if this is an aggregation query
		if (this.query.pipeline) {
			// For aggregation queries, we need to count differently
			const countPipeline = [...this.query.pipeline()];
			countPipeline.push({ $count: 'total' });
			const countResult = await Model.aggregate(countPipeline);
			totalDocs = countResult.length > 0 ? countResult[0].total : 0;
		} else {
			// For regular queries
			const queryConditions = this.query.getQuery();
			totalDocs = await Model.countDocuments(queryConditions);
		}

		const totalPages = Math.ceil(totalDocs / limit);
		const accumulator = Math.min(page * limit, totalDocs);

		let nextPage = null;
		let prevPage = null;

		const buildQueryString = (pageNum) => {
			const queryParams = { ...this.queryString };
			queryParams.page = pageNum;

			const queryString = Object.keys(queryParams)
				.filter((key) => queryParams[key] !== undefined && queryParams[key] !== '')
				.map((key) => `${key}=${queryParams[key]}`)
				.join('&');

			return `?${queryString}`;
		};

		if (page < totalPages) {
			nextPage = buildQueryString(page + 1);
		}

		if (page > 1) {
			prevPage = buildQueryString(page - 1);
		}

		this.query = this.query.skip(skip).limit(limit);

		return {
			totalDocs,
			totalPages,
			accumulator,
			currentPage: page,
			nextPage,
			prevPage,
		};
	}
}

module.exports = APIFeatures;
