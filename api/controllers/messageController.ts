import { Request, Response } from 'express';
import mongoClient from '../utils/db';
import redisClient from '../utils/redisClient';
import { logger } from '../utils/logger';
import db from '../utils/db';
import { IMessage } from '../models/messageModel';

class MessageController {
    static getKey(userId1: string, userId2: string) {
        const sortedIds = [userId1, userId2].sort();
        return `messages:${sortedIds.join(':')}`;
    }
    static async getMessages(req: Request, res: Response) {
        try {
            const userId1 = res.locals.userId;
            const userId2 = req.params.id;

            const user2 = await db.findUser({ _id: userId2 });
            if (!user2) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            const key = MessageController.getKey(userId1, userId2);
            let messages = await redisClient.getMessagesFromCache(key, 0, -1);

            if (messages) {
                res.status(200).json(messages);
                return;
            }

            messages = await db.findMessages({ $or: [{ to: userId1, from: userId2 }, { to: userId2, from: userId1 }] }) || [];

            messages.forEach((message: IMessage) => {
                message.message = Buffer.from(message.message, 'base64').toString('utf-8');
            });

            if (messages.length > 0) {
                await redisClient.saveMessagesToCache(key, messages);
            }

            const messageStr = messages.map((message: IMessage) => {
                return Buffer.from(JSON.stringify({
                    to: message.to,
                    from: message.from,
                    message: message.message,
                    timestamp: message.timestamp
                })).toString('base64');;
            });

            res.status(200).json(messages);
        } catch (error: any) {
            logger.error(`Error getting messages: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    static async addMessage(to: string, from: string, message: string) {
        try {
            const user1 = await db.findUser({ _id: to });
            const user2 = await db.findUser({ _id: from });



            if (!user1 || !user2) {
                return;
            }

            const key = MessageController.getKey(to, from);

            const newMessage = {
                to,
                from,
                message,
                timestamp: new Date()
            };

            const createdMessage = await db.createMessage(newMessage);


            await redisClient.addMessageToCache(key, {
                ...newMessage,
                _id: createdMessage.id
            });

            return createdMessage;
        } catch (error: any) {
            logger.error(`Error adding message: ${error.message}`);
            return;
        }
    }
}


export default MessageController;