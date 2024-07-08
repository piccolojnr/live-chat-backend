import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { IUser } from '../models/userModel';
import mongoClient from '../utils/db';
import { logger } from '../utils/logger';



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
      const userId = res.locals.userId;

      const user: IUser | null = await mongoClient.findUser({
        _id:
          userId
      });
      if (!user) {
        logger.error('User not found');
        return res.status(404).json({ error: 'User not found' });
      }


      res.status(200).json({
        id: user._id,
        username: user.username,
        phone: user.phone || '',
        profilePicture: user.profilePicture || '',
        bio: user.bio || '',
      });
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

      res.status(200).json({
        id: user._id,
        username: user.username,
        phone: user.phone || '',
        profilePicture: user.profilePicture || '',
        bio: user.bio || '',
      });
    } catch (error: any) {
      logger.error(`Error retrieving user: ${error.message}`);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getUsers(req: Request, res: Response) {
    try {
      const { query } = req.query;
      const users: IUser[] | null = await mongoClient.findUsers(query ? { username: { $regex: query, $options: 'i' } } : {});

      const usersData = users?.map(user => ({
        id: user._id,
        username: user.username,
        phone: user.phone || '',
        profilePicture: user.profilePicture || '',
        bio: user.bio || '',
      })) || [];

      res.status(200).json(usersData);
    } catch (error: any) {
      logger.error(`Error retrieving users: ${error.message}`);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

export default UserController;
