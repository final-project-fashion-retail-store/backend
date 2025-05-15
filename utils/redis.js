const { createClient } = require('redis');

const client = createClient({
	username: process.env.REDIS_USERNAME,
	password: process.env.REDIS_PASSWORD,
	socket: {
		host: process.env.REDIS_HOST,
		port: process.env.REDIS_PORT,
	},
});

client.on('connect', () => console.log('Redis Client Connected!!!💐💐💐'));

client.on('ready', () =>
	console.log('Redis Client connected and ready to use!!!💐💐💐')
);

client.on('error', (err) => console.log('Redis Client Error', err));

client.on('end', () => console.log('Redis Client Disconnected!!!💐💐💐'));

process.on('SIGINT', async () => {
	console.log('SIGINT received, shutting down gracefully');
	await client.quit();
	console.log('Redis Client Disconnected!!!💐💐💐');
	process.exit(0);
});

module.exports = client;
