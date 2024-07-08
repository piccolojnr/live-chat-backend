import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
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

      const chatId = new ObjectId();
      chat._id = chatId;
      await redisClient.set(`chat_${chatId}`, JSON.stringify(chat), 60 * 60 * 24);
      logger.info('Chat created successfully in Redis');

      await mongoClient.createChat(chat);
      res.status(201).json({ message: 'Chat created successfully', chatId });
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

      let decodedToken: any;
      try {
        decodedToken = jwt.verify(token, process.env.JWT_SECRET!);
      } catch (error) {
        logger.error('Invalid token');
        return res.status(401).json({ error: 'Invalid token' });
      }

      const userId = decodedToken.id;
      if (!userId) {
        logger.error('User token not found in Redis');
        return res.status(401).json({ error: 'User token not found in Redis' });
      }

      const chachedChats: IChat[] = JSON.parse(await redisClient.get(`chats_${userId}`) || '[]');
      if (chachedChats.length > 0) {
        chachedChats.forEach((chat: IChat) => {
          chat.messages.forEach((message: IMessage) => {
            message.message = Buffer.from(message.message, 'base64').toString('ascii');
          });
        });
        return res.status(200).json(chachedChats);
      }

      const chats = await mongoClient.findChats({ participants: userId });
      res.status(200).json(chats);
    } catch (error: any) {
      logger.error(`Error retrieving chats: ${error.message}`);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async addMessage(req: Request, res: Response) {
    try {
      const chatId = req.params.id;
      if (!chatId) {
        logger.error('Chat ID not found');
        return res.status(400).json({ error: 'Chat ID not found' });
      }

      const message: IMessage = req.body;
      if (!message.sender || !message.message) {
        logger.error('Invalid message');
        return res.status(400).json({ error: 'Invalid message' });
      }

      message.timestamp = new Date();
      message.message = Buffer.from(message.message).toString('base64');

      const chat = await mongoClient.findChat({ _id: chatId });
      if (!chat) {
        logger.error('Chat not found');
        return res.status(404).json({ error: 'Chat not found' });
      }

      chat.messages.push(message);
      await mongoClient.updateChat(chatId, chat);

      await redisClient.set(`chat_${chatId}`, JSON.stringify(chat), 60 * 60 * 24);
      logger.info('Message added successfully in Redis');

      res.status(200).json('Message added successfully');
    } catch (error: any) {
      logger.error(`Error adding message: ${error.message}`);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

export default ChatController;