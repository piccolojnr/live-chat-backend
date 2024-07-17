"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = require("./logger");
dotenv_1.default.config();
const host = process.env.REDIS_HOST || '';
const port = process.env.REDIS_PORT || '6379';
const password = process.env.REDIS_PASSWORD || '';
class RedisClient {
    constructor() {
        this.client = new ioredis_1.default({
            host,
            port: parseInt(port),
            password,
        });
        this.subClient = new ioredis_1.default({
            host,
            port: parseInt(port),
            password,
        });
        this.client.on('error', (error) => {
            logger_1.logger.error(`Redis client error: ${error.message}`);
        });
        this.subClient.on('error', (error) => {
            logger_1.logger.error(`Redis sub client error: ${error.message}`);
        });
        this.client.on('connect', () => {
            logger_1.logger.info('Connected to Redis');
        });
        this.subClient.on('connect', () => {
            logger_1.logger.info('Connected to Redis sub client');
        });
    }
    isAlive() {
        return this.client.status === 'ready';
    }
    async sadd(key, value) {
        await this.client.sadd(key, value);
    }
    async srem(key, value) {
        await this.client.srem(key, value);
    }
    async smembers(key) {
        return this.client.smembers(key);
    }
    async sismember(key, value) {
        return this.client.sismember(key, value);
    }
    async scard(key) {
        return this.client.scard(key);
    }
    async set(key, value, expire) {
        await this.client.set(key, value, 'EX', expire);
    }
    async get(key) {
        return this.client.get(key);
    }
    async del(key) {
        await this.client.del(key);
    }
    async publishMessage(chatId, message) {
        const key = `chat_${chatId}_messages`;
        const messageStr = Buffer.from(JSON.stringify(message)).toString('base64');
        await this.client.publish(key, messageStr);
    }
    async subscribeToChat(chatId, callback) {
        const key = `chat_${chatId}_messages`;
        await this.subClient.subscribe(key);
        this.subClient.on('message', callback);
    }
    async unsubscribe(chatId) {
        const key = `chat_${chatId}_messages`;
        await this.subClient.unsubscribe(key);
    }
    async getMessagesFromCache(chatId, start, end) {
        const key = `chat_${chatId}_messages`;
        const cachedMessages = await this.client.lrange(key, start, end);
        return cachedMessages.map((message) => JSON.parse(Buffer.from(message, 'base64').toString('ascii'))).reverse();
    }
    async addMessageToCache(chatId, message) {
        const key = `chat_${chatId}_messages`;
        const messageStr = Buffer.from(JSON.stringify(message)).toString('base64');
        await this.client.lpush(key, messageStr);
        await this.client.expire(key, 60 * 60 * 24); // 24 hours
    }
    async getMessagesCount(chatId) {
        const key = `chat_${chatId}_messages`;
        return this.client.llen(key);
    }
}
const redisClient = new RedisClient();
exports.default = redisClient;
