import http from "http";
import { Server } from "socket.io";
import app from "./app";
import { logger } from "./utils/logger";
import SocketService from "./utils/socket";

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL?.split(",") || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});


new SocketService(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`)
  logger.info(`Swagger available at *:${PORT}/swagger`);
}
);
