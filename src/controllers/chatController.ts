import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import AuthController from './authController';
import { IChat, IMessage } from '../models/chatModel';
import mongoClient from '../utils/db';
import RedisClient from '../utils/redisClient';
import { logger } from '../utils/logger';

const redisClient = new RedisClient();

class ChatController {
  static async createChat(req: Request, res: Response) {
    try {
      const chat: IChat = req.body;

      if (!chat.participants || chat.participants.length < 2) {
        logger.error('Invalid chat participants');
        return res.status(400).json({ error: 'Invalid chat participants' });
      }
      for (let i = 0; i < chat.participants.length; i++) {
        const participant = await mongoClient.findUser({ username: chat.participants[i] });
        if (!participant) {
          logger.error('Participant not found');
          return res.status(404).json({ error: 'Participant not found' });
        }
        chat.participants[i] = participant.id;
      }
      chat.messages = [];
      res.status(200).json(await mongoClient.createChat(chat));
    } catch (error: any) {
      logger.error(`Error creating chat: ${error.message}`);
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
      const token = req.cookies.token;
      if (!token) {
        logger.error('User token not found');
        return res.status(401).json({ error: 'User token not found' });
      }

      const userId = await AuthController.checkAuth(token);
      const cachedChats: IChat[] = JSON.parse(await redisClient.get(`chats_${userId}`) || '[]');
      if (cachedChats.length > 0) {
        cachedChats.forEach((chat: IChat) => {
          chat.messages.forEach((message: IMessage) => {
            message.message = Buffer.from(message.message, 'base64').toString('ascii');
          });
        });
        return res.status(200).json(cachedChats);
      }

      const chats = await mongoClient.findChats({ participants: userId });
      res.status(200).json(chats);
    } catch (error: any) {
      logger.error(`Error retrieving chats: ${error.message}`);
      if (error.message === 'Invalid token' || error.message === 'User token not found in Redis') {
        return res.status(401).json({ error: error.message });
      }
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
}

export default ChatController;
