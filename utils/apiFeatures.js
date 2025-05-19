const AppError = require('../utils/appError');

class APIFeatures {
	constructor(query, queryString) {
		this.query = query;
		this.queryString = queryString;
	}

	filter() {
		const queryObj = { ...this.queryString };
		const excludedFields = ['page', 'sort', 'limit', 'fields'];
		excludedFields.forEach((field) => delete queryObj[field]);

		// 2/ advanced filtering
		let queryStr = JSON.stringify(queryObj);
		queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

		this.query.find(JSON.parse(queryStr));
	}

	sort() {
		if (this.queryString.sort) {
			const sortBy = this.queryString.sort.split(',').join(' ');
			this.query = this.query.sort(sortBy);
		} else {
			this.query = this.query.sort('-createdAt _id');
		}
	}

	limitFields() {
		if (this.queryString.fields) {
			const fields = this.queryString.fields.split(',').join(' ');
			this.query = this.query.select(fields);
		} else {
			this.query = this.query.select('-__v');
		}
	}

	async paginate() {
		const page = this.queryString.page * 1 || 1;
		const limit = this.queryString.limit * 1 || 100;
		const skip = (page - 1) * limit;

		// Store the filter conditions before applying pagination
		const queryConditions = this.query.getQuery();

		// Clone the model to get a count with the same conditions
		const Model = this.query.model;

		const totalDocs = await Model.countDocuments(queryConditions);

		const totalPages = Math.ceil(totalDocs / limit);

		let nextPage = null;
		let prevPage = null;

		if (page < totalPages) {
			nextPage = `?page=${page + 1}&limit=${limit}`;
		}

		if (page > 1) {
			prevPage = `?page=${page - 1}&limit=${limit}`;
		}

		this.query = this.query.skip(skip).limit(limit);

		return {
			totalDocs,
			totalPages,
			currentPage: page,
			nextPage,
			prevPage,
		};
	}
}

module.exports = APIFeatures;
