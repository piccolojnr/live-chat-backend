import http from "http";
import { Server } from "socket.io";
import app from "./app";
import { logger } from "./utils/logger";
import AuthController from "./controllers/authController";
import redisClient from "./utils/redisClient";
import db from "./utils/db";

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});


io.on("connection", async (socket) => {
  logger.info("New WebSocket connection");
  const subscribedRooms = new Set();
  let userId;
  try {
    const token = socket.handshake.auth.token;
    userId = await AuthController.checkAuth(token as string);
  } catch (error: any) {
    logger.error(`Authentication Error: ${error.message}`);
    socket.emit("error", { message: "Authentication failed." });
    socket.disconnect();
    return;
  }

  // Increment online count and emit to all clients
  await redisClient.sadd('online_users', userId);
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

    await redisClient.sadd(`user_rooms:${userId}`, room);
    await redisClient.sadd(`room_users:${room}`, userId);

    // Subscribe to chat messages for the room
    // redisClient.subscribeToChat(room, (channel, message) => {
    //   subscribedRooms.add(room);
    //   io.to(room).emit('message', message);
    // });

    // Notify the room that the user has joined
    io.to(room).emit('roomNotification', {
      type: 'join',
      users: await redisClient.smembers(`room_users:${room}`),
    });
    logger.info(`User joined room: ${room}`);
  });

  socket.on("send-message", async (room) => {
    if (!room) {
      socket.emit("error", { message: "Room is required" });
      return;
    }

    const lastMessage = await db.getChatLastMessage(room);
    if (!lastMessage) {
      logger.error('Last message not found');
      return;
    }

    lastMessage.message = Buffer.from(lastMessage.message, 'base64').toString('ascii');

    const messageStr = Buffer.from(JSON.stringify(lastMessage)).toString('base64');
    io.to(room).emit('message', messageStr);
  });

  socket.on("leaveRoom", async (room) => {
    socket.leave(room);
    await redisClient.srem(`user_rooms:${userId}`, room);
    await redisClient.srem(`room_users:${room}`, userId);
    await redisClient.unsubscribe(room);

    // Notify the room that the user has left
    io.to(room).emit('roomNotification', {
      type: 'leave',
      users: await redisClient.smembers(`room_users:${room}`),
    });
    logger.info(`User left room: ${room}`);
  });



  socket.on("disconnect", async () => {
    await redisClient.srem('online_users', userId);

    // Retrieve and notify all rooms the user was part of
    const rooms = await redisClient.smembers(`user_rooms:${userId}`);
    rooms.forEach((room) => {
      io.to(room).emit('userDisconnected', { userId });
    });


    // Clean up user rooms
    await redisClient.del(`user_rooms:${userId}`);
    updateOnlineCount();
    logger.info("User disconnected");
  });

  socket.on("error", (error) => {
    logger.error(`Socket Error: ${error.message}`);
  });
});

const updateOnlineCount = async () => {
  const onlineCount = await redisClient.scard('online_users');
  io.emit('online', onlineCount.toString());
};


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`)
  logger.info(`Swagger available at http://localhost:${PORT}/swagger`);
}
);
