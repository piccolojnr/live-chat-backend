"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const app_1 = __importDefault(require("./app"));
const logger_1 = require("./utils/logger");
const authController_1 = __importDefault(require("./controllers/authController"));
const redisClient_1 = __importDefault(require("./utils/redisClient"));
const db_1 = __importDefault(require("./utils/db"));
const server = http_1.default.createServer(app_1.default);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    }
});
io.on("connection", async (socket) => {
    logger_1.logger.info("New WebSocket connection");
    const subscribedRooms = new Set();
    let userId;
    try {
        const token = socket.handshake.auth.token;
        userId = await authController_1.default.checkAuth(token);
    }
    catch (error) {
        logger_1.logger.error(`Authentication Error: ${error.message}`);
        socket.emit("error", { message: "Authentication failed." });
        socket.disconnect();
        return;
    }
    // Increment online count and emit to all clients
    await redisClient_1.default.sadd('online_users', userId);
    updateOnlineCount();
    socket.on("joinRoom", async (room) => {
        if (!room) {
            socket.emit("error", { message: "Room is required" });
            return;
        }
        if (subscribedRooms.has(room)) {
            socket.emit("error", { message: "Already joined the room" });
            return;
        }
        socket.join(room);
        await redisClient_1.default.sadd(`user_rooms:${userId}`, room);
        await redisClient_1.default.sadd(`room_users:${room}`, userId);
        // Subscribe to chat messages for the room
        // redisClient.subscribeToChat(room, (channel, message) => {
        //   subscribedRooms.add(room);
        //   io.to(room).emit('message', message);
        // });
        // Notify the room that the user has joined
        io.to(room).emit('roomNotification', {
            type: 'join',
            users: await redisClient_1.default.smembers(`room_users:${room}`),
        });
        logger_1.logger.info(`User joined room: ${room}`);
    });
    socket.on("send-message", async (room) => {
        if (!room) {
            socket.emit("error", { message: "Room is required" });
            return;
        }
        const lastMessage = await db_1.default.getChatLastMessage(room);
        if (!lastMessage) {
            logger_1.logger.error('Last message not found');
            return;
        }
        lastMessage.message = Buffer.from(lastMessage.message, 'base64').toString('ascii');
        const messageStr = Buffer.from(JSON.stringify(lastMessage)).toString('base64');
        io.to(room).emit('message', messageStr);
    });
    socket.on("leaveRoom", async (room) => {
        socket.leave(room);
        await redisClient_1.default.srem(`user_rooms:${userId}`, room);
        await redisClient_1.default.srem(`room_users:${room}`, userId);
        await redisClient_1.default.unsubscribe(room);
        // Notify the room that the user has left
        io.to(room).emit('roomNotification', {
            type: 'leave',
            users: await redisClient_1.default.smembers(`room_users:${room}`),
        });
        logger_1.logger.info(`User left room: ${room}`);
    });
    socket.on("disconnect", async () => {
        await redisClient_1.default.srem('online_users', userId);
        // Retrieve and notify all rooms the user was part of
        const rooms = await redisClient_1.default.smembers(`user_rooms:${userId}`);
        rooms.forEach((room) => {
            io.to(room).emit('userDisconnected', { userId });
        });
        // Clean up user rooms
        await redisClient_1.default.del(`user_rooms:${userId}`);
        updateOnlineCount();
        logger_1.logger.info("User disconnected");
    });
    socket.on("error", (error) => {
        logger_1.logger.error(`Socket Error: ${error.message}`);
    });
});
const updateOnlineCount = async () => {
    const onlineCount = await redisClient_1.default.scard('online_users');
    io.emit('online', onlineCount.toString());
};
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    logger_1.logger.info(`Server running on port ${PORT}`);
    logger_1.logger.info(`Swagger available at http://localhost:${PORT}/swagger`);
});
