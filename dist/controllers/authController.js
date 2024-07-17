"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const userModel_1 = __importDefault(require("../models/userModel"));
const redisClient_1 = __importDefault(require("../utils/redisClient"));
const logger_1 = require("../utils/logger");
const constants_1 = require("../utils/constants");
class AuthController {
    static async createToken(user, res, rememberMe = false) {
        const token = jsonwebtoken_1.default.sign({ id: user._id, rememberMe }, constants_1.JWT_SECRET, { expiresIn: rememberMe ? '30d' : '1d' });
        const redisExpiration = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24;
        await redisClient_1.default.set(`auth_${token}`, user.id.toString(), redisExpiration);
        return token;
    }
    static async getConnect(req, res) {
        try {
            const authHeader = req.headers.authorization;
            const { rememberMe } = req.body;
            if (!authHeader || !authHeader.startsWith('Basic ')) {
                logger_1.logger.error('Authorization header missing or malformed');
                return res.status(400).json({ error: 'Bad request' });
            }
            const base64Credentials = authHeader.split(' ')[1];
            const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
            const [username, password] = credentials.split(':');
            if (!username || !password) {
                logger_1.logger.error('Username or password not found');
                return res.status(400).json({ error: 'Bad request' });
            }
            const user = await userModel_1.default.findOne({ username });
            if (!user) {
                logger_1.logger.error('User not found');
                return res.status(404).json({ error: 'User not found' });
            }
            const isValidPassword = await bcrypt_1.default.compare(password, user.password);
            if (!isValidPassword) {
                logger_1.logger.error('Invalid password');
                return res.status(400).json({ error: 'Invalid password' });
            }
            const token = await AuthController.createToken(user, res, rememberMe === 'true');
            logger_1.logger.info('User connected');
            return res.status(200).json({
                id: user._id,
                username: user.username,
                phone: user.phone || '',
                profilePicture: user.profilePicture || '',
                bio: user.bio || '',
                token,
            });
        }
        catch (error) {
            logger_1.logger.error(error.message);
            return res.status(500).json({ error: error.message });
        }
    }
    static async auth(req, res) {
        const token = req.header('X-Token');
        if (!token) {
            logger_1.logger.error('Token not found');
            return res.status(401).json({ error: 'Token not found' });
        }
        try {
            const userId = await AuthController.checkAuth(token);
            logger_1.logger.info('User authenticated');
            return res.status(200).json({ userId });
        }
        catch (error) {
            logger_1.logger.error(error.message);
            return res.status(500).json({ error: error.message });
        }
    }
    static async checkAuth(token) {
        if (!token) {
            logger_1.logger.error('Token needs to be passed');
            throw new Error('Token needs to be passed');
        }
        let decodedToken;
        try {
            decodedToken = jsonwebtoken_1.default.verify(token, constants_1.JWT_SECRET);
        }
        catch (error) {
            logger_1.logger.error('Invalid token');
            throw new Error('Invalid token');
        }
        const userId = await redisClient_1.default.get(`auth_${token}`);
        if (!userId) {
            logger_1.logger.error('User token not found in Redis');
            throw new Error('User token not found in Redis');
        }
        return userId;
    }
    static async getDisconnect(req, res) {
        const token = req.header('X-Token');
        if (!token) {
            logger_1.logger.error('Token not found');
            return res.status(401).json({ error: 'Token not found' });
        }
        const userId = await redisClient_1.default.get(`auth_${token}`);
        if (!userId) {
            logger_1.logger.error('User token not found');
            return res.status(401).json({ error: 'User token not found' });
        }
        await redisClient_1.default.del(`auth_${token}`);
        res.clearCookie('token');
        logger_1.logger.info('User disconnected');
        return res.status(204).send();
    }
    static async checkAuthMiddleware(req, res, next) {
        const token = req.header('X-Token');
        if (!token) {
            logger_1.logger.error('Token not found');
            return res.status(401).json({ error: 'Token not found' });
        }
        if (!token) {
            logger_1.logger.error('Token not found');
            return res.status(401).json({ error: 'Token not found' });
        }
        try {
            const userId = await AuthController.checkAuth(token);
            res.locals.userId = userId;
            next();
        }
        catch (error) {
            logger_1.logger.error(error.message);
            return res.status(500).json({ error: error.message });
        }
    }
}
exports.default = AuthController;
