import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { IUser } from '../models/userModel';
import mongoClient from '../utils/db';
import RedisClient from '../utils/redisClient';
import { logger } from '../utils/logger';

const redisClient = new RedisClient();


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

      await mongoClient.createUser(user);
      res.status(201).json('User created successfully');
    } catch (error: any) {
      logger.error(`Error creating user: ${error.message}`);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getUser(req: Request, res: Response) {
    try {
      const token = req.cookies.token;
      if (!token) {
        logger.error('User token not found');
        return res.status(401).json({ error: 'User token not found' });
      }

      let decodedToken: any;
      try {
        decodedToken = jwt.verify(token, process.env.JWT_SECRET!);
      } catch (error) {
        logger.error('Invalid token');
        return res.status(401).json({ error: 'Invalid token' });
      }

      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) {
        logger.error('User token not found in Redis');
        return res.status(401).json({ error: 'User token not found in Redis' });
      }

      const user: IUser | null = await mongoClient.findUser({ _id: userId });
      if (!user) {
        logger.error('User not found');
        return res.status(404).json({ error: 'User not found' });
      }
      res.status(200).json(user);
    } catch (error: any) {
      logger.error(`Error retrieving user: ${error.message}`);
      res.status(500).json({ error: 'Internal Server Error'});
    }
  }
}

export default UserController;
