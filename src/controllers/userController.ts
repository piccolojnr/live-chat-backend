import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { IUser } from '../models/userModel';
import mongoClient from '../utils/db';
import { logger } from '../utils/logger';
import AuthController from './authController';
import ChatController from './chatController';


class UserController {
  static async createUser(req: Request, res: Response) {
    try {
      const user: IUser = req.body;
      if (!user.username || !user.password) {
        logger.error('Username or password not found');
        return res.status(400).json({ error: 'Username or password not found' });
      }

      const existingUser = await mongoClient.findUser({ username: user.username });
      if (existingUser) {
        logger.error('User already exists');
        return res.status(409).json({ error: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(user.password, 10);
      user.password = hashedPassword;

      const newUser = await mongoClient.createUser(user);

      await AuthController.createToken(newUser, res);

      logger.info('User connected');
      return res.status(201).json(newUser);
    } catch (error: any) {
      logger.error(`Error creating user: ${error.message}`);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getUser(req: Request, res: Response) {
    try {
      const userId = res.locals.userId;

      const user: IUser | null = await mongoClient.findUser({
        _id:
          userId
      });
      if (!user) {
        logger.error('User not found');
        return res.status(404).json({ error: 'User not found' });
      }

      logger.info('User retrieved');
      res.status(200).json(user);
    } catch (error: any) {
      logger.error(`Error retrieving user: ${error.message}`);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getUserByUsername(req: Request, res: Response) {
    try {
      const username = req.params.username;

      const user: IUser | null = await mongoClient.findUser({ username });
      if (!user) {
        logger.error('User not found');
        return res.status(404).json({ error: 'User not found' });
      }

      res.status(200).json(user);
    } catch (error: any) {
      logger.error(`Error retrieving user: ${error.message}`);
      if (error.message === 'Invalid token' || error.message === 'User token not found in Redis') {
        return res.status(401).json({ error: error.message });
      }
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }



  static async updateUser(req: Request, res: Response) {
    try {
      const token = req.cookies.token;
      if (!token) {
        logger.error('User token not found');
        return res.status(401).json({ error: 'User token not found' });
      }

      const userId = await AuthController.checkAuth(token);
      const user: IUser = req.body;
      if (!user.username || !user.password) {
        logger.error('Username or password not found');
        return res.status(400).json({ error: 'Username or password not found' });
      }

      const hashedPassword = await bcrypt.hash(user.password, 10);
      user.password = hashedPassword;

      await mongoClient.updateUser(userId, user);
      res.status(200).json('User updated successfully');
    } catch (error: any) {
      logger.error(`Error updating user: ${error.message}`);
      if (error.message === 'Invalid token' || error.message === 'User token not found in Redis') {
        return res.status(401).json({ error: error.message });
      }
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async deleteUser(req: Request, res: Response) {
    try {
      const token = req.cookies.token;
      if (!token) {
        logger.error('User token not found');
        return res.status(401).json({ error: 'User token not found' });
      }

      const userId = await AuthController.checkAuth(token);
      await ChatController.deleteChats(req, res);
      await AuthController.getDisconnect(req, res);
      await mongoClient.deleteUser(userId);
      res.status(200).json('User deleted successfully');
    } catch (error: any) {
      logger.error(`Error deleting user: ${error.message}`);
      if (error.message === 'Invalid token' || error.message === 'User token not found in Redis') {
        return res.status(401).json({ error: error.message });
      }
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getUsers(req: Request, res: Response) {
    try {
      const { query } = req.query;
      const users: IUser[] | null = await mongoClient.findUsers(query ? { username: { $regex: query, $options: 'i' } } : {});

      // remove me
      const userId = res.locals.userId;

      const usersData = users?.filter(
        user => user.id.toString() !== userId
      )

      res.status(200).json(usersData);
    } catch (error: any) {
      logger.error(`Error retrieving users: ${error.message}`);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

export default UserController;
