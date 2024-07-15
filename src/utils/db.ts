import mongoose, { Model, Mongoose } from "mongoose";
import { IChat, IMessage } from "../models/chatModel";
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

  public async createUser(user: IUser): Promise<IUser> {
    return await this.userModel.create(user);
  }

  public async createChat(chat: IChat): Promise<IChat> {
    return await this.chatModel.create(chat);

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
      .populate(
        {
          path: 'participants',
          select: 'username profilePicture'
        }
      )
      .select("-messages")
      .exec();
  }

  public async findChatMessages(query: any): Promise<IChat | null> {
    return await this.chatModel.findOne(query).populate({
      path: 'messages.sender',
      select: 'username profilePicture'
    }).exec();
  }




  public async findChats(query: any): Promise<IChat[] | null> {
    return await this.chatModel.find(query)
      .populate(
        {
          path: 'participants',
          select: 'username profilePicture'
        }
      )
      .select("-messages")
      .exec()
  }
  public async addMessageToChat(chatId: string, message: IMessage) {
    const updateResult = await this.chatModel.findByIdAndUpdate(
      chatId,
      {
        $push: { messages: message },
        $set: { lastMessage: message }
      },
      { new: true, useFindAndModify: false }
    );
    return updateResult;
  }

  public async getChatLastMessage(chatId: string): Promise<IMessage | null> {
    return (await this.chatModel.findOne({
      _id: chatId,
    })
      .populate({
        path: 'lastMessage.sender',
        select: 'username profilePicture'
      })
      .select("-messages")
      .exec())?.lastMessage || null;
  }

  public async getMessagesFromChat(chatId: string, skip: number, limit: number) {
    return this.chatModel.findById(chatId, {
      messages: { $slice: [skip, limit] }
    }).select('messages');
  }


  public async updateChat(query: any, update: any): Promise<void> {
    await this.chatModel.updateOne(query, update)
      .select("-messages")
      .exec();
  }

  public async updateUser(query: any, update: any): Promise<void> {
    await this.userModel.updateOne(query, update)
      .exec();
  }

  public async deleteChat(query: any): Promise<void> {
    await this.chatModel.deleteOne(query).exec();
  }

  public async deleteChats(query: any): Promise<void> {
    await this.chatModel.deleteMany(query).exec();
  }

  public async deleteUser(query: any): Promise<void> {
    await this.userModel.deleteOne
      (query).exec();
  }
}

export default MongoClient.getInstance();
