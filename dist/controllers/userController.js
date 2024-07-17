"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = __importDefault(require("../utils/db"));
const logger_1 = require("../utils/logger");
const authController_1 = __importDefault(require("./authController"));
const chatController_1 = __importDefault(require("./chatController"));
class UserController {
    static async createUser(req, res) {
        try {
            const user = req.body;
            if (!user.username || !user.password) {
                logger_1.logger.error('Username or password not found');
                return res.status(400).json({ error: 'Username or password not found' });
            }
            const existingUser = await db_1.default.findUser({ username: user.username });
            if (existingUser) {
                logger_1.logger.error('User already exists');
                return res.status(409).json({ error: 'User already exists' });
            }
            const hashedPassword = await bcrypt_1.default.hash(user.password, 10);
            user.password = hashedPassword;
            const newUser = await db_1.default.createUser(user);
            const token = await authController_1.default.createToken(newUser, res);
            logger_1.logger.info('User connected');
            return res.status(201).json({
                id: newUser._id,
                username: newUser.username,
                phone: newUser.phone || '',
                profilePicture: newUser.profilePicture || '',
                bio: newUser.bio || '',
                token,
            });
        }
        catch (error) {
            logger_1.logger.error(`Error creating user: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    static async getUser(req, res) {
        try {
            const userId = res.locals.userId;
            const user = await db_1.default.findUser({
                _id: userId
            });
            if (!user) {
                logger_1.logger.error('User not found');
                return res.status(404).json({ error: 'User not found' });
            }
            logger_1.logger.info('User retrieved');
            res.status(200).json(user);
        }
        catch (error) {
            logger_1.logger.error(`Error retrieving user: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    static async getUserByUsername(req, res) {
        try {
            const username = req.params.username;
            const user = await db_1.default.findUser({ username });
            if (!user) {
                logger_1.logger.error('User not found');
                return res.status(404).json({ error: 'User not found' });
            }
            res.status(200).json(user);
        }
        catch (error) {
            logger_1.logger.error(`Error retrieving user: ${error.message}`);
            if (error.message === 'Invalid token' || error.message === 'User token not found in Redis') {
                return res.status(401).json({ error: error.message });
            }
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    static async updateUser(req, res) {
        try {
            const token = req.cookies.token;
            if (!token) {
                logger_1.logger.error('User token not found');
                return res.status(401).json({ error: 'User token not found' });
            }
            const userId = await authController_1.default.checkAuth(token);
            const user = req.body;
            if (!user.username || !user.password) {
                logger_1.logger.error('Username or password not found');
                return res.status(400).json({ error: 'Username or password not found' });
            }
            const hashedPassword = await bcrypt_1.default.hash(user.password, 10);
            user.password = hashedPassword;
            await db_1.default.updateUser(userId, user);
            res.status(200).json('User updated successfully');
        }
        catch (error) {
            logger_1.logger.error(`Error updating user: ${error.message}`);
            if (error.message === 'Invalid token' || error.message === 'User token not found in Redis') {
                return res.status(401).json({ error: error.message });
            }
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    static async deleteUser(req, res) {
        try {
            const token = req.cookies.token;
            if (!token) {
                logger_1.logger.error('User token not found');
                return res.status(401).json({ error: 'User token not found' });
            }
            const userId = await authController_1.default.checkAuth(token);
            await chatController_1.default.deleteChats(req, res);
            await authController_1.default.getDisconnect(req, res);
            await db_1.default.deleteUser(userId);
            res.status(200).json('User deleted successfully');
        }
        catch (error) {
            logger_1.logger.error(`Error deleting user: ${error.message}`);
            if (error.message === 'Invalid token' || error.message === 'User token not found in Redis') {
                return res.status(401).json({ error: error.message });
            }
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    static async getUsers(req, res) {
        try {
            const { query } = req.query;
            const users = await db_1.default.findUsers(query ? { username: { $regex: query, $options: 'i' } } : {});
            // remove me
            const userId = res.locals.userId;
            const usersData = users?.filter(user => user.id.toString() !== userId);
            res.status(200).json(usersData);
        }
        catch (error) {
            logger_1.logger.error(`Error retrieving users: ${error.message}`);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
exports.default = UserController;
