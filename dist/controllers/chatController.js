"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const authController_1 = __importDefault(require("./authController"));
const db_1 = __importDefault(require("../utils/db"));
const redisClient_1 = __importDefault(require("../utils/redisClient"));
const logger_1 = require("../utils/logger");
class ChatController {
    static async createChat(req, res) {
        try {
            const chat = req.body;
            if (!chat.participants || chat.participants.length < 1) {
                logger_1.logger.error('Invalid chat participants');
                return res.status(400).json({ error: 'Invalid chat participants' });
            }
            let name = chat.participants.join(':');
            for (let i = 0; i < chat.participants.length; i++) {
                const participant = await db_1.default.findUser({ username: chat.participants[i] });
                if (!participant) {
                    logger_1.logger.error('Participant not found');
                    return res.status(404).json({ error: 'Participant not found' });
                }
                chat.participants[i] = participant.id;
            }
            const user = await db_1.default.findUser({ _id: res.locals.userId });
            if (!user) {
                logger_1.logger.error('User not found');
                return res.status(404).json({ error: 'User not found' });
            }
            name += `:${user.username}`;
            chat.name = name;
            chat.participants.push(res.locals.userId);
            const existingChat = await db_1.default.findChat({ participants: { $all: chat.participants } });
            if (existingChat) {
                return res.status(200).json(existingChat);
            }
            chat.messages = [];
            res.status(201).json(await db_1.default.createChat(chat));
        }
        catch (error) {
            logger_1.logger.error(`Error creating chat: ${error.message}`);
            if (error.code === 11000) {
                logger_1.logger.error('Chat already exists');
                return res.status(409).json({ error: 'Chat already exists' });
            }
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    static async getChat(req, res) {
        try {
            const chatId = req.params.id;
            if (!chatId) {
                logger_1.logger.error('Chat ID not found');
                return res.status(400).json({ error: 'Chat ID not found' });
            }
            const chachedChat = JSON.parse(await redisClient_1.default.get(`chat_${chatId}`) || 'null');
            if (chachedChat) {
                chachedChat.messages.forEach((message) => {
                    message.message = Buffer.from(message.message, 'base64').toString('ascii');
                });
                return res.status(200).json(chachedChat);
            }
            const chat = await db_1.default.findChat({ _id: chatId });
            if (!chat) {
                logger_1.logger.error('Chat not found');
                return res.status(404).json({ error: 'Chat not found' });
            }
            chat.messages.forEach((message) => {
                message.message = Buffer.from(message.message, 'base64').toString('ascii');
            });
            res.status(200).json(chat);
        }
        catch (error) {
            logger_1.logger.error(`Error retrieving chat: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    static async getChats(req, res) {
        try {
            const userId = res.locals.userId;
            const { query } = req.query;
            const chats = await db_1.default.findChats({ participants: userId, name: { $regex: query ? query : "", $options: 'i' } });
            chats?.forEach((chat) => {
                if (chat.lastMessage && chat.lastMessage.message)
                    chat.lastMessage.message = Buffer.from(chat.lastMessage.message, 'base64').toString('ascii');
            });
            res.status(200).json(chats || []);
        }
        catch (error) {
            logger_1.logger.error(`Error retrieving chats: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    static async updateChat(req, res) {
        try {
            const chatId = req.params.id;
            if (!chatId) {
                logger_1.logger.error('Chat ID not found');
                return res.status(400).json({ error: 'Chat ID not found' });
            }
            const chat = req.body;
            if (!chat.participants || chat.participants.length < 2) {
                logger_1.logger.error('Invalid chat participants');
                return res.status(400).json({ error: 'Invalid chat participants' });
            }
            if (!chat.messages || chat.messages.length < 1) {
                logger_1.logger.error('Invalid chat messages');
                return res.status(400).json({ error: 'Invalid chat messages' });
            }
            chat.messages.forEach((message) => {
                if (!message.sender || !message.message) {
                    logger_1.logger.error('Invalid message');
                    return res.status(400).json({ error: 'Invalid message' });
                }
            });
            chat.messages.forEach((message) => {
                message.timestamp = new Date();
                message.message = Buffer.from(message.message).toString('base64');
            });
            await redisClient_1.default.set(`chat_${chatId}`, JSON.stringify(chat), 60 * 60 * 24);
            logger_1.logger.info('Chat updated successfully in Redis');
            await db_1.default.updateChat({ _id: chatId }, chat);
            res.status(200).json('Chat updated successfully');
        }
        catch (error) {
            logger_1.logger.error(`Error updating chat: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    static async deleteChat(req, res) {
        try {
            const chatId = req.params.id;
            if (!chatId) {
                logger_1.logger.error('Chat ID not found');
                return res.status(400).json({ error: 'Chat ID not found' });
            }
            await db_1.default.deleteChat({ _id: chatId });
            await redisClient_1.default.del(`chat_${chatId}`);
            res.status(200).json('Chat deleted successfully');
        }
        catch (error) {
            logger_1.logger.error(`Error deleting chat: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    static async deleteChats(req, res) {
        try {
            const token = req.cookies.token;
            if (!token) {
                logger_1.logger.error('User token not found');
                return res.status(401).json({ error: 'User token not found' });
            }
            const userId = await authController_1.default.checkAuth(token);
            await db_1.default.deleteChats({ participants: userId });
            res.status(200).json('Chats deleted successfully');
        }
        catch (error) {
            logger_1.logger.error(`Error deleting chats: ${error.message}`);
            if (error.message === 'Invalid token' || error.message === 'User token not found in Redis') {
                return res.status(401).json({ error: error.message });
            }
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    static async getChatMessages(req, res) {
        try {
            const chatId = req.params.id;
            if (!chatId) {
                logger_1.logger.error('Chat ID not found');
                return res.status(400).json({ error: 'Chat ID not found' });
            }
            const { page = 1, limit = 10 } = req.query;
            const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
            const cachedMessages = await redisClient_1.default.getMessagesFromCache(chatId, skip, skip + limit - 1);
            if (cachedMessages.length > 0) {
                return res.status(200).json(cachedMessages);
            }
            const chat = await db_1.default.getMessagesFromChat(chatId, skip, parseInt(limit, 10));
            if (!chat) {
                logger_1.logger.error('Chat not found');
                return res.status(404).json({ error: 'Chat not found' });
            }
            const messages = chat.messages.map((message) => {
                message.message = Buffer.from(message.message, 'base64').toString('ascii');
                return message;
            });
            for (const message of messages) {
                await redisClient_1.default.addMessageToCache(chatId, message);
            }
            res.status(200).json(messages);
        }
        catch (error) {
            logger_1.logger.error(`Error retrieving chat messages: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    static async addChatMessage(req, res) {
        try {
            const chatId = req.params.id;
            if (!chatId) {
                logger_1.logger.error('Chat ID not found');
                return res.status(400).json({ error: 'Chat ID not found' });
            }
            const { message } = req.body;
            if (!message) {
                logger_1.logger.error('Message not found');
                return res.status(400).json({ error: 'Message not found' });
            }
            const sender = await db_1.default.findUser({ _id: res.locals.userId });
            if (!sender) {
                logger_1.logger.error('Sender not found');
                return res.status(404).json({ error: 'Sender not found' });
            }
            const newMessage = {
                sender: sender.id,
                message: Buffer.from(message).toString('base64'),
                timestamp: new Date()
            };
            // Add message to MongoDB
            const chat = await db_1.default.addMessageToChat(chatId, newMessage);
            if (!chat) {
                logger_1.logger.error('Chat not found');
                return res.status(404).json({ error: 'Chat not found' });
            }
            // Get updated last message from MongoDB
            const lastMessage = await db_1.default.getChatLastMessage(chatId);
            if (!lastMessage) {
                logger_1.logger.error('Last message not found');
                return res.status(404).json({ error: 'Last message not found' });
            }
            // Decode message for response
            lastMessage.message = Buffer.from(lastMessage.message, 'base64').toString('ascii');
            // publish message to Redis
            await redisClient_1.default.publishMessage(chatId, lastMessage);
            // Update Redis cache with the new message
            await redisClient_1.default.addMessageToCache(chatId, lastMessage);
            logger_1.logger.info('Chat updated successfully in Redis');
            res.status(201).json(lastMessage);
        }
        catch (error) {
            logger_1.logger.error(`Error adding chat message: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
exports.default = ChatController;
