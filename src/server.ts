import http from "http";
import { Server } from "socket.io";
import app from "./app";
import { logger } from "./utils/logger";
import AuthController from "./controllers/authController";
import RedisClient from "./utils/redisClient";

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});
const redisClient = new RedisClient();


io.on("connection", async (socket) => {
  logger.info("New WebSocket connection");

  try {
    // get token from cookie and check if it is valid
    const token = socket.handshake.auth.token;
    logger.info(`Token: ${token}`);
    await AuthController.checkAuth(token as string);
  } catch (error: any) {
    logger.error(`Authentication Error: ${error.message}`);
    socket.emit("error", { message: "Authentication failed." });
    socket.disconnect();
    return;
  }


  // Increment online count and emit to all clients
  redisClient.get("online").then((online) => {
    const updatedCount = (parseInt(online || "0") + 1).toString();
    redisClient.set("online", updatedCount, 3600);
    io.emit("online-update", updatedCount); // Broadcast updated count to all clients
  });



  socket.on("joinRoom", async (room) => {

    socket.join(room);

    redisClient.get(`online_${room}`).then((online) => {
      const newOnlineRoomCount = online ? parseInt(online) + 1 : 1;
      redisClient.set(`online_${room}`, newOnlineRoomCount.toString(), 3600);
      io.to(room).emit("onlineRoom", newOnlineRoomCount.toString());
    });

    redisClient.subscribeToChat(room, (channel, message) => {
      const msg = JSON.parse(Buffer.from(message, "base64").toString("ascii"));
      socket.emit("message", msg);
    });

    logger.info(`User joined room: ${room}`);
  });

  socket.on("chatMessage", async (msg) => {

    io.to(msg.room).emit("message", msg);
    logger.info(`Message: ${msg.text} sent to room: ${msg.room}`);
  });

  socket.on("leaveRoom", async (room) => {

    socket.leave(room);

    redisClient.get(`online_${room}`).then((online) => {
      const newOnlineRoomCount = online ? parseInt(online) - 1 : 0;
      redisClient.set(`online_${room}`, newOnlineRoomCount.toString(), 3600);
      io.to(room).emit("onlineRoom", newOnlineRoomCount.toString());
    });

    redisClient.unsubscribe(room);

    logger.info(`User left room: ${room}`);
  });

  socket.on("disconnect", () => {
    // Decrement online count and emit to all clients
    redisClient.get("online").then((online) => {
      const _online = parseInt(online || "0")
      if (_online > 0) {
        const updatedCount = (_online - 1).toString();
        redisClient.set("online", updatedCount, 3600);
        io.emit("online-update", updatedCount); // Broadcast updated count to all clients
      }
    });
    logger.info("User disconnected");
  });


  socket.on("error", (error) => {
    logger.error(`Socket Error: ${error.message}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`)
  logger.info(`Swagger available at http://localhost:${PORT}/swagger`);
}
);
