const express = require('express');
const app = express();
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const globalErrorHandler = require('./controllers/errorController');
const apiKeyAuth = require('./middlewares/apiKeyAuth');
const AppError = require('./utils/appError');
const userRouter = require('./routes/userRoutes');
const authRouter = require('./routes/authRoutes');

// GLOBAL MIDDLEWARES
// Development logging
if (process.env.NODE_ENV === 'development') {
	app.use(morgan('dev'));
}

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Routes
app.use(apiKeyAuth);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);

app.all('/{*any}', (req, res, next) => {
	next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
