const express = require('express');
const app = express();
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');

const globalErrorHandler = require('./controllers/errorController');
const apiKeyAuth = require('./middlewares/apiKeyAuth');
const AppError = require('./utils/appError');
const userRouter = require('./routes/userRoutes');
const authRouter = require('./routes/authRoutes');
const imageRouter = require('./routes/imageRoutes');

// GLOBAL MIDDLEWARES
// Development logging
if (process.env.NODE_ENV === 'development') {
	app.use(morgan('dev'));
}

// security HTTP headers
app.use(helmet());
// Enable CORS
app.use(
	cors({
		origin: 'http://localhost:5173',
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
		allowedHeaders: [
			'Content-Type',
			'Authorization',
			'withCredentials',
			'Access-Control-Allow-Credentials',
			'x-api-key',
			'skipAuthRefresh',
			'_retry',
		],
	})
);
app.options('/{*any}', cors());

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Routes
app.use(apiKeyAuth);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/images', imageRouter);

app.all('/{*any}', (req, res, next) => {
	next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
