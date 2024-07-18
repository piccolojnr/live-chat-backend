import Redis from 'ioredis';
import dotenv from 'dotenv';
import { IMessage } from '../models/chatModel';
import { logger } from './logger';

dotenv.config();

const host = process.env.REDIS_HOST!;
const port = process.env.REDIS_PORT!;
const password = process.env.REDIS_PASSWORD!;


class RedisClient {
    private client: Redis;
    private subClient: Redis;

    constructor() {
        this.client = new Redis({
            host,
            port: parseInt(port),
            password,
        });
        this.subClient = new Redis({
            host,
            port: parseInt(port),
            password,
        });

        this.client.on('error', (error) => {
            logger.error(`Redis client error: ${error.message}`);

        });

        this.subClient.on('error', (error) => {
            logger.error(`Redis sub client error: ${error.message}`);
        });

        this.client.on('connect', () => {
            logger.info('Connected to Redis');
        });

        this.subClient.on('connect', () => {
            logger.info('Connected to Redis sub client');
        });
    }

    isAlive(): boolean {
        return this.client.status === 'ready';
    }

    async sadd(key: string, value: string) {
        await this.client.sadd(key, value);
    }

    async srem(key: string, value: string) {
        await this.client.srem(key, value);
    }

    async smembers(key: string) {
        return this.client.smembers(key);
    }

    async sismember(key: string, value: string) {
        return this.client.sismember(key, value);
    }

    async scard(key: string) {
        return this.client.scard(key);
    }

    async set(key: string, value: string, expire: number) {
        await this.client.set(key, value, 'EX', expire);
    }

    async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    async del(key: string) {
        await this.client.del(key);
    }

    async publishMessage(chatId: string, message: IMessage) {
        const key = `chat_${chatId}_messages`;
        const messageStr = Buffer.from(JSON.stringify(message)).toString('base64');
        await this.client.publish(key, messageStr);
    }

    async subscribeToChat(chatId: string, callback: (channel: string, message: string) => void): Promise<void> {
        const key = `chat_${chatId}_messages`;
        await this.subClient.subscribe(key);
        this.subClient.on('message', callback);
    }

    async unsubscribe(chatId: string): Promise<void> {
        const key = `chat_${chatId}_messages`;
        await this.subClient.unsubscribe(key);
    }


    async getMessagesFromCache(chatId: string, start: number, end: number) {
        const key = `chat_${chatId}_messages`;
        const cachedMessages = await this.client.lrange(key, start, end);
        return cachedMessages.map((message: string) => JSON.parse(Buffer.from(message, 'base64').toString('ascii'))).reverse();
    }

    async addMessageToCache(chatId: string, message: IMessage) {
        const key = `chat_${chatId}_messages`;
        const messageStr = Buffer.from(JSON.stringify(message)).toString('base64');
        await this.client.lpush(key, messageStr);
        await this.client.expire(key, 60 * 60 * 24); // 24 hours
    }

    async getMessagesCount(chatId: string) {
        const key = `chat_${chatId}_messages`;
        return this.client.llen(key);
    }
}

const redisClient = new RedisClient();

export default redisClient;
