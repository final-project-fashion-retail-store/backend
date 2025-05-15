const mongoose = require('mongoose');
require('dotenv').config();

const app = require('./index');
const client = require('./utils/redis');

// uncaught exception error
process.on('uncaughtException', (err) => {
	console.log(err.name, err.message);
	console.log('Uncaught Exception! Shutting down...');
	process.exit(1);
});

// redis connection
const connectRedis = async () => {
	await client.connect();
	// await client.set('foo', 'bar');
	// const result = await client.get('foo');
	// console.log(result);
	// await client.del('foo');
};
connectRedis();

// db connection string
const db = process.env.DATABASE.replace(
	'<db_password>',
	process.env.DB_PASSWORD
);

// connect to db
const connect = async () => {
	try {
		await mongoose.connect(db);
		console.log('MongoDB connection successful!!!💐💐💐');
	} catch (err) {
		console.log(err);
	}
};
connect();

const port = process.env.PORT;
const server = app.listen(port, () => {
	console.log(`App listening on port ${port}`);
});

//unhanded rejection error
process.on('unhandledRejection', (err) => {
	console.log(err.name, err.message);
	console.log('Unhandled Rejection! Shutting down...');
	server.close(() => {
		process.exit(1);
	});
});

process.on('SIGTERM', () => {
	console.log('SIGTERM received, shutting down gracefully');
	// Perform cleanup operations
	server.close(() => {
		process.exit(0);
	});
});
