import Redis from 'ioredis';
import dotenv from 'dotenv';

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
}

export default RedisClient;
