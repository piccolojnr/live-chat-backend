import mongoose, { Model, Mongoose } from "mongoose";
import { IChat } from "../models/chatModel";
import { IUser } from "../models/userModel";
import User from "../models/userModel";
import Chat from "../models/chatModel";

class MongoClient {
  private static instance: MongoClient;
  private client: Mongoose;
  private userModel: Model<IUser> = User;
  private chatModel: Model<IChat> = Chat;

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
    await this.client.connect(uri);
  }

  public async disconnect(): Promise<void> {
    await this.client.disconnect();
  }

  public isAlive(): boolean {
    return this.client.connection.readyState === 1;
  }

  public getClient(): Mongoose {
    return this.client;
  }

  public async createUser(user: IUser): Promise<void> {
    await this.userModel.create(user);
  }

  public async createChat(chat: IChat): Promise<void> {
    await this.chatModel.create(chat);
  }

  public async findUser(query: any): Promise<IUser | null> {
    return await this.userModel.findOne(query)
      .select("-password")
      .exec();
  }
  public async findUsers(query: any): Promise<IUser[] | null> {
    return await this.userModel.find(query)
      .select("-password")
      .exec();
  }
  public async findChat(query: any): Promise<IChat | null> {
    return await this.chatModel.findOne(query)
      .populate("participants", "username")
      .select("-messages")
      .exec();
  }

  public async findChats(query: any): Promise<IChat[] | null> {
    return await this.chatModel.find(query)
      .populate("participants", "username")
      .select("-messages")
      .exec()
  }

  public async updateChat(query: any, update: any): Promise<void> {
    await this.chatModel.updateOne(query, update)
      .select("-messages")
      .exec();
  }


}

export default MongoClient.getInstance();
