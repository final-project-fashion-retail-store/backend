const express = require('express');
const { app } = require('./utils/socket');
// const app = express();
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const qs = require('qs');

const globalErrorHandler = require('./controllers/errorController');
const apiKeyAuth = require('./middlewares/apiKeyAuth');
const AppError = require('./utils/appError');
const userRouter = require('./routes/userRoutes');
const authRouter = require('./routes/authRoutes');
const imageRouter = require('./routes/imageRoutes');
const addressRouter = require('./routes/addressRoutes');
const categoryRouter = require('./routes/categoryRoutes');
const subcategoryRouter = require('./routes/subcategoryRoutes');
const brandRouter = require('./routes/brandRoutes');
const productRouter = require('./routes/productRoutes');
const messageRouter = require('./routes/messageRoutes');
const wishlistRouter = require('./routes/wishlistRoutes');
const cartRouter = require('./routes/cartRoutes');
const orderRouter = require('./routes/orderRoutes');

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
		origin: ['http://localhost:5173', 'http://localhost:3000'],
		credentials: true,
	})
);

app.options('/{*any}', cors());

// Body parser, reading data from body into req.body
app.set('query parser', (str) => {
	return qs.parse(str);
});
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Routes
app.use(apiKeyAuth);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/images', imageRouter);
app.use('/api/v1/addresses', addressRouter);
app.use('/api/v1/categories', categoryRouter);
app.use('/api/v1/subcategories', subcategoryRouter);
app.use('/api/v1/brands', brandRouter);
app.use('/api/v1/products', productRouter);
app.use('/api/v1/messages', messageRouter);
app.use('/api/v1/wishlist', wishlistRouter);
app.use('/api/v1/cart', cartRouter);
app.use('/api/v1/orders', orderRouter);

app.all('/{*any}', (req, res, next) => {
	next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);
// module.exports = app;
