import http from "http";
import { Server } from "socket.io";
import app from "./app";
import { logger } from "./utils/logger";
import AuthController from "./controllers/authController";

const server = http.createServer(app);
const io = new Server(server);


io.on("connection", (socket) => {
  logger.info("New WebSocket connection");

  socket.on("joinRoom", (room) => {
    try {
      AuthController.checkAuth(socket.handshake.headers.tk as string);
    } catch (error: any) {
      logger.error(`Authintication Error: ${error.message}`);
      return;
    }
    socket.join(room);
    logger.info(`User joined room: ${room}`);
  });

  socket.on("chatMessage", (msg) => {
    try {
      AuthController.checkAuth(socket.handshake.headers.tk as string);
    } catch (error: any) {
      logger.error(`Authintication Error: ${error.message}`);
      return;
    }
    io.to(msg.room).emit("message", msg);
    logger.info(`Message: ${msg.text} sent to room: ${msg.room}`);
  });

  socket.on("leaveRoom", (room) => {
    try {
      AuthController.checkAuth(socket.handshake.headers.tk as string);
    } catch (error: any) {
      logger.error(`Authintication Error: ${error.message}`);
      return;
    }
    socket.leave(room);
    logger.info(`User left room: ${room}`);
  });

  socket.on("disconnect", () => {
    try {
      AuthController.checkAuth(socket.handshake.headers.tk as string);
    } catch (error: any) {
      logger.error(`Authintication Error: ${error.message}`);
      return;
    }
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
