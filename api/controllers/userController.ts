import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { IPublicUser, IUser } from '../models/userModel';
import mongoClient from '../utils/db';
import { logger } from '../utils/logger';
import cloudinary from 'cloudinary';
import fs from 'fs';
import MessageController from './messageController';
import db from '../utils/db';
import { IMessage } from '../models/messageModel';


class UserController {
  static async createUser(req: Request, res: Response) {
    try {
      const user: IUser = req.body;
      if (!user.username || !user.password) {
        logger.error('Username or password not found');
        return res.status(400).json({ error: 'Username or password not found' });
      }

      const existingUser = await mongoClient.findUser({ username: user.username.toLowerCase() });
      if (existingUser) {
        logger.error('User already exists');
        return res.status(409).json({ error: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(user.password, 10);
      user.password = hashedPassword;

      const newuser = await mongoClient.createUser(user);

      if (!newuser) {
        logger.error('Error creating user');
        return res.status(500).json({ error: 'Internal Server Error' });
      }


      return res.status(201).json({
        message: 'User created successfully',
      });
    } catch (error: any) {
      logger.error(`Error creating user: ${error.message}`);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getUser(req: Request, res: Response) {
    try {
      const userId = res.locals.userId;

      const user: IUser | null = await mongoClient.findUser({
        _id: userId
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

  static async getUserById(req: Request, res: Response) {
    try {
      const userId = req.params.id;
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

  static async deleteProfilePicture(user: IUser, profilePicture: string) {
    if (user.profilePicture) {
      if (user.profilePicture !== profilePicture) {
        if (process.env.NODE_ENV === 'production') {
          const publicId = user.profilePicture.split('/').pop()?.split('.')[0];
          await cloudinary.v2.uploader.destroy(`chat-app/${publicId}`);
        } else {
          const path = user.profilePicture.split('/').pop();
          await fs.unlink(`${path}`, (err) => {
            if (err) {
              logger.error(`Error deleting profile picture: ${err.message}`);
            }
          });

        }
      }
    }
  }



  static async updateUser(req: Request, res: Response) {
    try {

      const userId = res.locals.userId;
      const { bio, phone, profilePicture: picture } = req.body;
      const profilePicture = req.file ? req.file.path : picture;

      const user: IUser | null = await mongoClient.findUser({
        _id: userId
      });

      if (!user) {
        logger.error('User not found');
        return res.status(404).json({ error: 'User not found' });
      }

      await UserController.deleteProfilePicture(user, profilePicture);

      if (profilePicture) {
        if (process.env.NODE_ENV === 'production') {
          user.profilePicture = profilePicture;
        } else {
          user.profilePicture = `http://localhost:5000/${profilePicture}`;
        }
      }



      user.bio = bio;
      user.phone = phone;


      user.save();

      logger.info('User updated');

      res.status(200).json({
        id: user._id,
        username: user.username,
        phone: user.phone || '',
        profilePicture: user.profilePicture || '',
        bio: user.bio || '',
      });
    } catch (error: any) {
      logger.error(`Error updating user: ${error.message}`);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }



  static async getUsers(req: Request, res: Response) {
    try {
      const { query } = req.query;
      const users: IUser[] | null = await mongoClient.findUsers(query ? { username: { $regex: query, $options: 'i' } } : {});

      const userId = res.locals.userId;

      const usersData: IPublicUser[] = []

      for (const user of users || []) {
        if (user.id === userId) {
          continue;
        }
        usersData.push({
          _id: user._id,
          username: user.username,
          phone: user.phone || '',
          profilePicture: user.profilePicture || '',
          bio: user.bio || '',
          lastMessage: await db.findLastMessage({ key: MessageController.getKey(userId, user._id as string) }) || undefined
        });
      }

      res.status(200).json(usersData);
    } catch (error: any) {
      logger.error(`Error retrieving users: ${error.message}`);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

export default UserController;
