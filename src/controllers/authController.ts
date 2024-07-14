import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/userModel';
import RedisClient from '../utils/redisClient';
import { logger } from '../utils/logger';
import { JWT_SECRET } from '../utils/constants';

const redisClient = new RedisClient();

class AuthController {

    static async createToken(user: any, res: Response, rememberMe: boolean = false) {
        const token = jwt.sign(
            { id: user._id, rememberMe },   
            JWT_SECRET,
            { expiresIn: rememberMe ? '30d' : '1d' }
        );
        const redisExpiration = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24;
        await redisClient.set(`auth_${token}`, user.id.toString(), redisExpiration);
        
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
        });
    }
    static async getConnect(req: Request, res: Response) {
        try {
            const authHeader = req.headers.authorization;
            const { rememberMe } = req.body;

            if (!authHeader || !authHeader.startsWith('Basic ')) {
                logger.error('Authorization header missing or malformed');
                return res.status(400).json({ error: 'Bad request' });
            }

            const base64Credentials = authHeader.split(' ')[1];
            const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
            const [username, password] = credentials.split(':');

            if (!username || !password) {
                logger.error('Username or password not found');
                return res.status(400).json({ error: 'Bad request' });
            }

            const user = await User.findOne({ username });
            if (!user) {
                logger.error('User not found');
                return res.status(404).json({ error: 'User not found' });
            }

            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                logger.error('Invalid password');
                return res.status(400).json({ error: 'Invalid password' });
            }

            await AuthController.createToken(user, res, rememberMe === 'true');

            logger.info('User connected');
            return res.status(200).json({
                id: user._id,
                username: user.username,
                phone: user.phone || '',
                profilePicture: user.profilePicture || '',
                bio: user.bio || '',
            });
        } catch (error: any) {
            logger.error(error.message);
            return res.status(500).json({ error: error.message });
        }
    }

    static async auth(req: Request, res: Response) {
        const token = req.cookies.token;
        if (!token) {
            logger.error('Token not found');
            return res.status(401).json({ error: 'Token not found' });
        }

        try {
            const userId = await AuthController.checkAuth(token);
            logger.info('User authenticated');
            return res.status(200).json({ userId });
        } catch (error: any) {
            logger.error(error.message);
            return res.status(500).json({ error: error.message });
        }
    }

    static async checkAuth(token: string) {
        if (!token) {
            logger.error('Token needs to be passed');
            throw new Error('Token needs to be passed');
        }

        let decodedToken: any;
        try {
            decodedToken = jwt.verify(token, JWT_SECRET);
        } catch (error) {
            logger.error('Invalid token');
            throw new Error('Invalid token');
        }

        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) {
            logger.error('User token not found in Redis');
            throw new Error('User token not found in Redis');
        }
        return userId;
    }

    static async getDisconnect(req: Request, res: Response) {
        const token = req.cookies.token;

        if (!token) {
            logger.error('Token not found');
            return res.status(401).json({ error: 'Token not found' });
        }

        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) {
            logger.error('User token not found');
            return res.status(401).json({ error: 'User token not found' });
        }

        await redisClient.del(`auth_${token}`);
        res.clearCookie('token');
        logger.info('User disconnected');
        return res.status(204).send();
    }

    static async checkAuthMiddleware(req: Request, res: Response, next: any) {
        const token = req.cookies.token;
        if (!token) {
            logger.error('Token not found');
            return res.status(401).json({ error: 'Token not found' });
        }

        try {
            const userId = await AuthController.checkAuth(token);
            res.locals.userId = userId;
            next();
        } catch (error: any) {
            logger.error(error.message);
            return res.status(500).json({ error: error.message });
        }
    }
}

export default AuthController;
