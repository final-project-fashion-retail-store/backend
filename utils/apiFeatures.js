const AppError = require('../utils/appError');

const regexSearch = (search) => {
	return new RegExp(search, 'i');
};

class APIFeatures {
	constructor(query, queryString) {
		this.query = query;
		this.queryString = queryString;
	}

	filter() {
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

			// this.query = this.query.find({
			// 	$or: [
			// 		{ city: regex },
			// 		{ district: regex },
			// 		{ ward: regex },
			// 		{ addressLine: regex },
			// 		{ name: regex },
			// 		{ phoneNumber: regex },
			// 		userQuery,
			// 	],
			// });

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

		// 1/ remove fields that are not part of the query
		const excludedFields = [
			'page',
			'sort',
			'limit',
			'fields',
			'userManageSearch',
			'addressManageSearch',
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
		} else {
			this.query = this.query.select('-__v');
		}
		return this;
	}

	async paginate() {
		// const queryObj = { ...this.queryString };
		const page = this.queryString.page * 1 || 1;
		const limit = this.queryString.limit * 1 || 100;
		const skip = (page - 1) * limit;

		// Store the filter conditions before applying pagination
		const queryConditions = this.query.getQuery();

		// Clone the model to get a count with the same conditions
		const Model = this.query.model;

		const totalDocs = await Model.countDocuments(queryConditions);

		const totalPages = Math.ceil(totalDocs / limit);

		// Calculate accumulator: total items processed up to current page
		const accumulator = Math.min(page * limit, totalDocs);

		let nextPage = null;
		let prevPage = null;

		// Build query string preserving all original parameters except page
		const buildQueryString = (pageNum) => {
			const queryParams = { ...this.queryString };
			queryParams.page = pageNum;
			// queryParams.limit = limit;

			const queryString = Object.keys(queryParams)
				.filter((key) => queryParams[key] !== undefined && queryParams[key] !== '')
				.map((key) => `${key}=${encodeURIComponent(queryParams[key])}`)
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
