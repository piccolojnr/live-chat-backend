import http from 'http';
// import { Server } from 'socket.io';
import app from './app';
import { logger } from './utils/logger';

const server = http.createServer(app);
// const io = new Server(server);

// io.on('connection', (socket) => {
//     logger.info('New WebSocket connection');

//     socket.on('joinRoom', (room) => {
//         socket.join(room);
//         logger.info(`User joined room: ${room}`);
//     });

//     socket.on('chatMessage', (msg) => {
//         io.to(msg.room).emit('message', msg);
//         logger.info(`Message: ${msg.text} sent to room: ${msg.room}`);
//     });

//     socket.on('disconnect', () => {
//         logger.info('User disconnected');
//     });
// });

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`)
    logger.info(`Swagger available at http://localhost:${PORT}/swagger`);
}
);
