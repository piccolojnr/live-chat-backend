import { Request, Response } from 'express';
import AuthController from './authController';
import { IChat, IMessage } from '../models/chatModel';
import mongoClient from '../utils/db';
import redisClient from '../utils/redisClient';
import { logger } from '../utils/logger';


class ChatController {
  static async createChat(req: Request, res: Response) {
    try {
      const chat: IChat = req.body;

      if (!chat.participants || chat.participants.length < 1) {
        logger.error('Invalid chat participants');
        return res.status(400).json({ error: 'Invalid chat participants' });
      }
      let name = chat.participants.join(':');
      for (let i = 0; i < chat.participants.length; i++) {
        const participant = await mongoClient.findUser({ username: chat.participants[i] });
        if (!participant) {
          logger.error('Participant not found');
          return res.status(404).json({ error: 'Participant not found' });
        }
        chat.participants[i] = participant.id;
      }

      const user = await mongoClient.findUser({ _id: res.locals.userId });
      if (!user) {
        logger.error('User not found');
        return res.status(404).json({ error: 'User not found' });
      }

      name += `:${user.username}`;
      chat.name = name;
      chat.participants.push(res.locals.userId);


      const existingChat = await mongoClient.findChat({ participants: { $all: chat.participants } });
      if (existingChat) {
        return res.status(200).json(existingChat);
      }

      chat.messages = [];
      res.status(201).json(await mongoClient.createChat(chat));
    } catch (error: any) {
      logger.error(`Error creating chat: ${error.message}`);

      if (error.code === 11000) {
        logger.error('Chat already exists');
        return res.status(409).json({ error: 'Chat already exists' });
      }
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getChat(req: Request, res: Response) {
    try {

      const chatId = req.params.id;
      if (!chatId) {
        logger.error('Chat ID not found');
        return res.status(400).json({ error: 'Chat ID not found' });
      }

      const chachedChat: IChat | null = JSON.parse(await redisClient.get(`chat_${chatId}`) || 'null');
      if (chachedChat) {
        chachedChat.messages.forEach((message: IMessage) => {
          message.message = Buffer.from(message.message, 'base64').toString('ascii');
        });
        return res.status(200).json(chachedChat);
      }

      const chat = await mongoClient.findChat({ _id: chatId });
      if (!chat) {
        logger.error('Chat not found');
        return res.status(404).json({ error: 'Chat not found' });
      }

      chat.messages.forEach((message: IMessage) => {
        message.message = Buffer.from(message.message, 'base64').toString('ascii');
      });

      res.status(200).json(chat);
    } catch (error: any) {
      logger.error(`Error retrieving chat: ${error.message}`);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getChats(req: Request, res: Response) {
    try {
      const userId = res.locals.userId;
      const { query } = req.query;

      const chats = await mongoClient.findChats({ participants: userId, name: { $regex: query ? query : "", $options: 'i' } });

      chats?.forEach((chat: IChat) => {
        if (chat.lastMessage && chat.lastMessage.message)
          chat.lastMessage.message = Buffer.from(chat.lastMessage.message, 'base64').toString('ascii');
      });

      res.status(200).json(chats || []);
    } catch (error: any) {
      logger.error(`Error retrieving chats: ${error.message}`);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async updateChat(req: Request, res: Response) {
    try {
      const chatId = req.params.id;
      if (!chatId) {
        logger.error('Chat ID not found');
        return res.status(400).json({ error: 'Chat ID not found' });
      }

      const chat: IChat = req.body;
      if (!chat.participants || chat.participants.length < 2) {
        logger.error('Invalid chat participants');
        return res.status(400).json({ error: 'Invalid chat participants' });
      }
      if (!chat.messages || chat.messages.length < 1) {
        logger.error('Invalid chat messages');
        return res.status(400).json({ error: 'Invalid chat messages' });
      }
      chat.messages.forEach((message: IMessage) => {
        if (!message.sender || !message.message) {
          logger.error('Invalid message');
          return res.status(400).json({ error: 'Invalid message' });
        }
      });
      chat.messages.forEach((message: IMessage) => {
        message.timestamp = new Date();
        message.message = Buffer.from(message.message).toString('base64');
      });

      await redisClient.set(`chat_${chatId}`, JSON.stringify(chat), 60 * 60 * 24);
      logger.info('Chat updated successfully in Redis');

      await mongoClient.updateChat({ _id: chatId }, chat);
      res.status(200).json('Chat updated successfully');
    } catch (error: any) {
      logger.error(`Error updating chat: ${error.message}`);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async deleteChat(req: Request, res: Response) {
    try {
      const chatId = req.params.id;
      if (!chatId) {
        logger.error('Chat ID not found');
        return res.status(400).json({ error: 'Chat ID not found' });
      }

      await mongoClient.deleteChat({ _id: chatId });
      await redisClient.del(`chat_${chatId}`);
      res.status(200).json('Chat deleted successfully');
    } catch (error: any) {
      logger.error(`Error deleting chat: ${error.message}`);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async deleteChats(req: Request, res: Response) {
    try {
      const token = req.cookies.token;
      if (!token) {
        logger.error('User token not found');
        return res.status(401).json({ error: 'User token not found' });
      }

      const userId = await AuthController.checkAuth(token);
      await mongoClient.deleteChats({ participants: userId });
      res.status(200).json('Chats deleted successfully');
    } catch (error: any) {
      logger.error(`Error deleting chats: ${error.message}`);
      if (error.message === 'Invalid token' || error.message === 'User token not found in Redis') {
        return res.status(401).json({ error: error.message });
      }
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getChatMessages(req: Request, res: Response) {
    try {
      const chatId = req.params.id;
      if (!chatId) {
        logger.error('Chat ID not found');
        return res.status(400).json({ error: 'Chat ID not found' });
      }

      const { page = 1, limit = 10 } = req.query;
      const skip = (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);

      const cachedMessages = await redisClient.getMessagesFromCache(chatId, skip, skip + (limit as number) - 1);
      if (cachedMessages.length > 0) {
        return res.status(200).json(cachedMessages);
      }

      const chat = await mongoClient.getMessagesFromChat(chatId, skip, parseInt(limit as string, 10));
      if (!chat) {
        logger.error('Chat not found');
        return res.status(404).json({ error: 'Chat not found' });
      }

      const messages = chat.messages.map((message: IMessage) => {
        message.message = Buffer.from(message.message, 'base64').toString('ascii');
        return message;
      });

      for (const message of messages) {
        await redisClient.addMessageToCache(chatId, message);
      }

      res.status(200).json(messages);
    } catch (error: any) {
      logger.error(`Error retrieving chat messages: ${error.message}`);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async addChatMessage(req: Request, res: Response) {
    try {
      const chatId = req.params.id;
      if (!chatId) {
        logger.error('Chat ID not found');
        return res.status(400).json({ error: 'Chat ID not found' });
      }

      const { message } = req.body;
      if (!message) {
        logger.error('Message not found');
        return res.status(400).json({ error: 'Message not found' });
      }

      const sender = await mongoClient.findUser({ _id: res.locals.userId });
      if (!sender) {
        logger.error('Sender not found');
        return res.status(404).json({ error: 'Sender not found' });
      }

      const newMessage: IMessage = {
        sender: sender.id,
        message: Buffer.from(message).toString('base64'),
        timestamp: new Date()
      };

      // Add message to MongoDB
      const chat = await mongoClient.addMessageToChat(chatId, newMessage);
      if (!chat) {
        logger.error('Chat not found');
        return res.status(404).json({ error: 'Chat not found' });
      }





      // Get updated last message from MongoDB
      const lastMessage = await mongoClient.getChatLastMessage(chatId);
      if (!lastMessage) {
        logger.error('Last message not found');
        return res.status(404).json({ error: 'Last message not found' });
      }

      // Decode message for response
      lastMessage.message = Buffer.from(lastMessage.message, 'base64').toString('ascii');
      // publish message to Redis
      await redisClient.publishMessage(chatId, lastMessage);
      // Update Redis cache with the new message
      await redisClient.addMessageToCache(chatId, lastMessage);

      logger.info('Chat updated successfully in Redis');
      res.status(201).json(lastMessage);
    } catch (error: any) {
      logger.error(`Error adding chat message: ${error.message}`);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

}

export default ChatController;
