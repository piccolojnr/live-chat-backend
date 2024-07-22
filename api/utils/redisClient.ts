import Redis from 'ioredis';
import dotenv from 'dotenv';
import { IMessage, IPublicMessage } from '../models/messageModel';
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

    async rpush(key: string, value: string) {
        await this.client.rpush(key, value);
    }
    async lrange(key: string, start: number, end: number) {
        return this.client.lrange(key, start, end);
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



    async getMessagesFromCache(key: string, start: number, end: number) {
        const cachedMessages = await this.client.lrange(key, start, end);
        // return cachedMessages.map((message: string) => JSON.parse(Buffer.from(message, 'base64').toString('ascii'))).reverse();
        return cachedMessages;
    }

    async addMessageToCache(key: string, message: IPublicMessage) {
        const messageStr = Buffer.from(JSON.stringify(message)).toString('base64');
        await this.client.lpush(key, messageStr);
        await this.client.expire(key, 60 * 60 * 24); // 24 hours
    }

    async saveMessagesToCache(key: string, messages: IPublicMessage[]) {
        const messageStrs = messages.map((message: IPublicMessage) => Buffer.from(JSON.stringify(message)).toString('base64'));
        await this.client.lpush(key, ...messageStrs);
        await this.client.expire(key, 60 * 60 * 24); // 24 hours
    }

    async getMessagesCount(chatId: string) {
        const key = `chat_${chatId}_messages`;
        return this.client.llen(key);
    }

    async trimCache(key: string, start: number, end: number) {
        await this.client.ltrim(key, start, end);
    }
}

const redisClient = new RedisClient();

export default redisClient;
