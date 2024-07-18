import { Server, Socket } from "socket.io";
import { logger } from "../utils/logger";
import AuthController from "../controllers/authController";
import redisClient from "../utils/redisClient";
import db from "../utils/db";

class SocketService {
    io: Server;

    constructor(io: Server) {
        this.io = io;
        this.io.on("connection",
            (socket) => this.onConnection(socket)
        );
    }


    private async onConnection(socket: Socket) {
        logger.info("New WebSocket connection");
        await this.authenticate(socket);
        await redisClient.sadd('online_users', socket.data.userId);
        this.updateOnlineCount();
        this.onSendMessage(socket);
        this.onJoinRoom(socket);
        this.onLeaveRoom(socket);
        this.onDisconnect(socket);
    }

    private async updateOnlineCount() {
        const onlineUsers = await redisClient.scard('online_users');
        this.io.emit('onlineCount', onlineUsers);
    }

    private async authenticate(socket: Socket) {
        try {
            const token = socket.handshake.auth.token;
            socket.data.userId = await AuthController.checkAuth(token as string);
        } catch (error: any) {
            logger.error(`Authentication Error: ${error.message}`);
            socket.emit("error", { message: "Authentication failed." });
            socket.disconnect();
        }
    }

    private async onDisconnect(socket: Socket) {
        const userId = socket.data.userId;
        await redisClient.srem('online_users', userId);
        const rooms = await redisClient.smembers(`user_rooms:${userId}`);
        rooms.forEach((room) => {
            this.io.to(room).emit('userDisconnected', { userId });
        });

        await redisClient.del(`user_rooms:${userId}`);
        this.updateOnlineCount();
    }

    private async onSendMessage(socket: Socket) {
        socket.on("send-message", async ({ roomId, message }) => {
            if (!roomId) {
                socket.emit("error", { message: "Room is required" });
                return;
            }

            const lastMessage: any = await db.getChatLastMessage(roomId);
            if (!lastMessage) {
                socket.emit("error", { message: "Invalid room" });
                return;
            }
            lastMessage.message = Buffer.from(lastMessage.message, 'base64').toString('ascii');
            lastMessage.roomId = roomId;
            const messageStr = Buffer.from(JSON.stringify(lastMessage)).toString('base64');
            this.io.to(roomId).emit('message', messageStr);
        });
    }

    private async onLeaveRoom(socket: Socket) {
        socket.on("leaveRoom", async (room) => {
            socket.leave(room);
            await redisClient.srem(`user_rooms:${socket.data.userId}`, room);
            await redisClient.srem(`room_users:${room}`, socket.data.userId);

            await this.sendRoomNotification(socket, room, {
                type: 'leave',
                users: await redisClient.smembers(`room_users:${room}`),
            });

            logger.info(`User left room: ${room}`);
        });
    }

    private async onJoinRoom(socket: Socket) {
        socket.on("joinRoom", async (room) => {
            if (!room) {
                socket.emit("error", { message: "Room is required" });
                return;
            }

            socket.join(room);
            await redisClient.sadd(`user_rooms:${socket.data.userId}`, room);
            await redisClient.sadd(`room_users:${room}`, socket.data.userId);

            this.sendRoomNotification(socket, room, {
                type: 'join',
                users: await redisClient.smembers(`room_users:${room}`),
            });
            logger.info(`User joined room: ${room}`);
        });
    }

    private async sendNotification(socket: Socket, data: any) {
        socket.emit("notification", data);
    }


    private async sendRoomNotification(socket: Socket, room: string, data: any) {
        this.io.to(room).emit('roomNotification', data);
    }
}

export default SocketService;