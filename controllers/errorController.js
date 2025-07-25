const AppError = require('../utils/appError');

const sendErrorDev = (err, req, res) => {
	const isAPIError = req.originalUrl.startsWith('/api');
	console.log(err);
	if (isAPIError) {
		return res.status(err.statusCode).json({
			status: err.status,
			error: err,
			message: err.message,
			stack: err.stack,
		});
	} else {
		return res.status(err.statusCode).render('error', {
			title: 'Something went wrong',
			msg: err.message,
		});
	}
};

const sendErrorProd = (err, req, res) => {
	const isAPIError = req.originalUrl.startsWith('/api');

	if (isAPIError) {
		// Operational, trusted: could send detail message to clients
		if (err.isOperational) {
			return res.status(err.statusCode).json({
				status: err.status,
				message: err.message,
			});
		}

		// Programming errors or others: don't leak detail errors
		return res.status(500).json({
			status: 'error',
			message: 'Something went wrong!',
		});
	} else {
		if (err.isOperational) {
			return res.status(err.statusCode).render('error', {
				title: 'Something went wrong',
				msg: err.message,
			});
		}

		return res.status(500).render('error', {
			title: 'Something went wrong',
			msg: 'Please try again later.',
		});
	}
};

const handleCastErrorDB = (error) => {
	const message = `Invalid ${error.path}: ${error.value}`;

	return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (error) => {
	const value = error.errorResponse.errmsg.match(/(["'])(\\?.)*?\1/)[0];
	const message = `Duplicate field value: ${value}. Please use another value!`;

	return new AppError(message, 400);
};

const handleValidationErrorDB = (error) => {
	const fields = Object.keys(error.errors);
	const messages = Object.values(error.errors).map((el) => el.message);
	let errorMessage = [];
	for (let i = 0; i < fields.length; i++) {
		errorMessage.push(`${fields[i]}: ${messages[i]}`);
	}

	return new AppError(`<<Invalid input data>> ${errorMessage.join('// ')}`, 400);
};

const handleJWTError = () => new AppError('Invalid token!', 401);

const handleJWTExpiredError = () => new AppError('Token has expired!', 401);

module.exports = (err, req, res, next) => {
	if (process.env.NODE_ENV === 'development') {
		!err.statusCode && (err.statusCode = 500);
		!err.status && (err.status = 'error');

		if (err.name === 'JsonWebTokenError') err = handleJWTError();
		// if (err.name === 'TokenExpiredError') err = handleJWTExpiredError();
		sendErrorDev(err, req, res);
	} else if (process.env.NODE_ENV === 'production') {
		let error = Object.create(err);
		// For a unknown reason, cannot get the error message from the error object
		error.message = err.message;
		error.name = err.name;

		if (err.name === 'CastError') error = handleCastErrorDB(error);
		if (err.code === 11000) error = handleDuplicateFieldsDB(error);
		if (err.name === 'ValidationError') error = handleValidationErrorDB(error);
		if (err.name === 'JsonWebTokenError') error = handleJWTError();
		if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();
		sendErrorProd(error, req, res);
	}
};
