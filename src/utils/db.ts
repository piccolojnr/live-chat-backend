import mongoose, { Model, Mongoose } from "mongoose";
import { IChat } from "../models/chatModel";
import { IUser } from "../models/userModel";
import UserModel from "../models/userModel";
import ChatModel from "../models/chatModel";


class MongoClient {
  private static instance: MongoClient;
  private client: Mongoose;
  private userModel: Model<IUser> = UserModel;
  private chatModel: Model<IChat> = ChatModel;

  private constructor() {
    this.client = mongoose;
  }

  public static getInstance(): MongoClient {
    if (!MongoClient.instance) {
      MongoClient.instance = new MongoClient();
    }
    return MongoClient.instance;
  }

  public async connect(uri: string): Promise<void> {
    try {
      await this.client.connect(uri);
    } catch (error) {
      console.error("MongoDB connection error: ", error);
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
    } catch (error) {
      console.error("MongoDB disconnection error: ", error);
    }
  }

  public isAlive(): boolean {
    return this.client.connection.readyState === 1;
  }

  public getClient(): Mongoose {
    return this.client;
  }

  public async createUser(user: IUser): Promise<void> {
    try {
      await this.userModel.create(user);
    } catch (error) {
      console.error("Error inserting user: ", error);
    }
  }

  public async createChat(chat: IChat): Promise<void> {
    try {
      await this.chatModel.create(chat);
    } catch (error) {
      console.error("Error inserting chat: ", error);
    }
  }

  public async findUser(query: any): Promise<IUser | null> {
    try {
      return await this.userModel.findOne(query).exec();
    } catch (error) {
      console.error("Error finding user: ", error);
      return null;
    }
  }

  public async findChat(query: any): Promise<IChat | null> {
    try {
      return await this.chatModel.findOne(query).exec();
    } catch (error) {
      console.error("Error finding chat: ", error);
      return null;
    }
  }
}

export default MongoClient.getInstance();
