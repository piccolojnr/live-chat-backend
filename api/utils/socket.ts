import { Server, Socket } from "socket.io";
import { logger } from "../utils/logger";
import AuthController from "../controllers/authController";
import redisClient from "../utils/redisClient";
import MessageController from "../controllers/messageController";
import db from "./db";

class SocketService {
    io: Server;
    users: {
        id: string;
        socketId: string;
    }[] = [];

    constructor(io: Server) {
        this.io = io;
        this.io.on("connection",
            (socket) => this.onConnection(socket)
        );
    }


    private async onConnection(socket: Socket) {
        const profile = await this.authenticate(socket);
        this.users.push({ id: socket.data.userId, socketId: socket.id });
        this.updateUserList("update", {
            userId: socket.data.userId
        });
        this.onSendMessage(socket, profile);
        this.onDisconnect(socket);
        logger.info(`User connected: ${profile?.username}`);
    }

    // ----------------- New Helper Functions -----------------

    private async authenticate(socket: Socket) {
        try {
            const token = socket.handshake.auth.token;
            socket.data.userId = await AuthController.checkAuth(token as string);
            return await db.findUser({ _id: socket.data.userId });
        } catch (error: any) {
            logger.error(`Authentication Error: ${error.message}`);
            socket.emit("error", { message: "Authentication failed." });
            socket.disconnect();
        }
    }

    private async onSendMessage(socket: Socket, profile?: any) {
        socket.on("send-message", async ({ to, from, message }) => {
            if (!to || !from || !message) {
                socket.emit("error", { message: "Invalid message data" });
                return;
            }

            const createdMessage = await MessageController.addMessage(to, from, message);

            if (!createdMessage) {
                socket.emit("error", { message: "Error sending message" });
                return;
            }

            const messageData = {
                sender: from,
                key: createdMessage.key,
                username: profile.username,
                message,
                timestamp: createdMessage.timestamp
            };

            const messageStr = Buffer.from(JSON.stringify(messageData)).toString('base64');

            const socketId = this.users.find(user => user.id === to)?.socketId;
            if (socketId) {
                this.io.to(socketId).emit('message', messageStr);
            }
            socket.emit('message', messageStr);
        });
    }

    // private async onGetMessages(socket: Socket) {
    //     socket.on("get-messages", async ({ to, from }) => {
    //         if (!to || !from) {
    //             socket.emit("error", { message: "Invalid message data" });
    //             return;
    //         }

    //         // Extract and sort user IDs
    //         const sortedUserIds = [to, from].sort();

    //         // Generate the key based on sorted user IDs
    //         const key = `messages:${sortedUserIds.join(':')}`;


    //         try {
    //             // Fetch messages from Redis
    //             const messages = await redisClient.lrange(key, 0, -1);
    //             socket.emit('messages', messages);
    //         } catch (error) {
    //             console.error("Error fetching messages:", error);
    //         }
    //     });
    // }


    private updateUserList(type: 'update' | 'delete' = 'update', others?: { [x: string]: any }) {
        this.io.emit('userList', {
            users: this.users.map(user => user.id),
            type: type,
            ...others
        });
    }

    private async onDisconnect(socket: Socket) {
        socket.on("disconnect", () => {
            const userId = socket.data.userId;
            this.users = this.users.filter((user) => user.id !== userId);
            this.updateUserList("delete", {
                userId
            });
            logger.info(`User disconnected: ${userId}`);
        });
    }




    // ----------------- Old Helper Functions -----------------

    // private async updateOnlineCount() {
    //     const onlineUsers = await redisClient.scard('online_users');
    //     this.io.emit('onlineCount', onlineUsers);
    // }



    // private async onDisconnect(socket: Socket) {
    //     const userId = socket.data.userId;
    //     await redisClient.srem('online_users', userId);
    //     const rooms = await redisClient.smembers(`user_rooms:${userId}`);
    //     rooms.forEach((room) => {
    //         this.io.to(room).emit('userDisconnected', { userId });
    //     });

    //     await redisClient.del(`user_rooms:${userId}`);
    //     this.updateOnlineCount();
    // }

    // private async onSendMessage(socket: Socket) {
    //     socket.on("send-message", async ({ roomId, message }) => {
    //         if (!roomId) {
    //             socket.emit("error", { message: "Room is required" });
    //             return;
    //         }

    //         const lastMessage: any = await db.getChatLastMessage(roomId);
    //         if (!lastMessage) {
    //             socket.emit("error", { message: "Invalid room" });
    //             return;
    //         }
    //         lastMessage.message = Buffer.from(lastMessage.message, 'base64').toString('ascii');
    //         lastMessage.roomId = roomId;
    //         const messageStr = Buffer.from(JSON.stringify(lastMessage)).toString('base64');
    //         this.io.to(roomId).emit('message', messageStr);
    //     });
    // }

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