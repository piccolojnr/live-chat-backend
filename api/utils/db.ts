import mongoose, { Model, Mongoose } from "mongoose";
import { IUser } from "../models/userModel";
import User from "../models/userModel";
import Message, { IMessage, IPublicMessage } from "../models/messageModel";




class MongoClient {
  private static instance: MongoClient;
  private client: Mongoose;
  private userModel: Model<IUser> = User;
  private messageModel: Model<IMessage> = Message;

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

  // ----------------- User Functions -----------------

  public async createUser(user: IUser): Promise<IUser> {
    return await this.userModel.create(user);
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


  public async updateUser(query: any, update: any): Promise<void> {
    await this.userModel.updateOne(query, update)
      .exec();
  }

  public async deleteUser(query: any): Promise<void> {
    await this.userModel.deleteOne
      (query).exec();
  }


  // ----------------- Message Functions -----------------

  public async createMessage(message: IPublicMessage): Promise<IMessage> {
    return await this.messageModel.create(message);
  }

  public async findMessages(query: any): Promise<IMessage[] | null> {
    return await this.messageModel.find(query)
      .sort({ timestamp: -1 })
      .exec();
  }

  public async findLastMessage(query: any): Promise<IMessage | null> {
    return await this.messageModel.findOne(query)
      .sort({ timestamp: -1 })
      .exec();
  }

  public async deleteMessages(query: any): Promise<void> {
    await this.messageModel.deleteMany(query)
      .exec();
  }

  public async deleteMessage(query: any): Promise<void> {
    await this.messageModel.deleteOne(query)
      .exec();
  }


}

export default MongoClient.getInstance();
