import Redis from 'ioredis';
import dotenv from 'dotenv';
import { IMessage } from '../models/chatModel';

dotenv.config();

const host = process.env.REDIS_HOST || '';
const port = process.env.REDIS_PORT || '6379';
const password = process.env.REDIS_PASSWORD || '';


class RedisClient {
    private client: Redis;

    constructor() {
        this.client = new Redis({
            host,
            port: parseInt(port),
            password,
        });
    }

    isAlive(): boolean {
        return this.client.status === 'ready';
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

export default RedisClient;
