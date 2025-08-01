const { Server } = require('socket.io');
const http = require('http');
const express = require('express');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
	cors: {
		origin: [
			'http://localhost:5173',
			'http://localhost:3000',
			'https://purplebee.store',
		],
		methods: ['GET', 'POST'],
		credentials: true,
	},
	pingTimeout: 60000,
	pingInterval: 25000,
});

getReceiverSocketId = (userId) => {
	return userSocketMap[userId];
};

// used to store online users
const userSocketMap = {}; // {userId: socketId}

io.on('connection', (socket) => {
	console.log('A user connected', socket.id);

	const userId = socket.handshake.query.userId;
	if (userId && userId !== 'undefined') {
		// Check if user already has a connection
		const existingSocketId = userSocketMap[userId];
		if (existingSocketId && existingSocketId !== socket.id) {
			console.log(
				`🔄 User ${userId} already connected with socket ${existingSocketId}, replacing with ${socket.id}`
			);

			// Find and disconnect the old socket
			const existingSocket = io.sockets.sockets.get(existingSocketId);
			if (existingSocket) {
				console.log(`🔌 Disconnecting old socket: ${existingSocketId}`);
				existingSocket.disconnect(true);
			}
		}

		// Store the new socket mapping
		userSocketMap[userId] = socket.id;
		console.log(`📊 User ${userId} mapped to socket ${socket.id}`);
	}

	// Log current connections
	console.log('📊 Current connections:', Object.keys(userSocketMap).length);
	console.log('👥 Connected users:', Object.keys(userSocketMap));

	// io.emit() is used to send events to all the connected clients
	io.emit('getOnlineUsers', Object.keys(userSocketMap));

	socket.on('disconnect', () => {
		console.log('A user disconnected', socket.id);
		delete userSocketMap[userId];
		io.emit('getOnlineUsers', Object.keys(userSocketMap));
	});

	// Handle ping for connection testing
	socket.on('ping', (data) => {
		console.log(`🏓 Ping received from ${userId}:`, data);
		socket.emit('pong', `Server received: ${data}`);
	});

	socket.on('disconnect', (reason) => {
		console.log(`A user disconnected ${socket.id}, reason: ${reason}`);

		// Find and remove the user from the map
		let disconnectedUserId = null;
		for (const [uid, sid] of Object.entries(userSocketMap)) {
			if (sid === socket.id) {
				disconnectedUserId = uid;
				break;
			}
		}

		if (disconnectedUserId) {
			delete userSocketMap[disconnectedUserId];
			console.log(`🗑️ Removed user ${disconnectedUserId} from connections`);
		}

		console.log(
			'📊 Connections after disconnect:',
			Object.keys(userSocketMap).length
		);
		io.emit('getOnlineUsers', Object.keys(userSocketMap));
	});

	// Handle connection errors
	socket.on('error', (error) => {
		console.error('Socket error:', error);
	});
});

// Periodic cleanup of stale connections
setInterval(() => {
	console.log('🧹 Performing periodic cleanup...');
	const connectedSockets = Array.from(io.sockets.sockets.keys());
	const staleUsers = [];

	for (const [userId, socketId] of Object.entries(userSocketMap)) {
		if (!connectedSockets.includes(socketId)) {
			staleUsers.push(userId);
		}
	}

	staleUsers.forEach((userId) => {
		console.log(`🗑️ Removing stale connection for user ${userId}`);
		delete userSocketMap[userId];
	});

	if (staleUsers.length > 0) {
		console.log(`🧹 Cleaned up ${staleUsers.length} stale connections`);
		io.emit('getOnlineUsers', Object.keys(userSocketMap));
	}
}, 30000); // Every 30 seconds

module.exports = { io, app, server, getReceiverSocketId };
