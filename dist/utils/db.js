"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const userModel_1 = __importDefault(require("../models/userModel"));
const chatModel_1 = __importDefault(require("../models/chatModel"));
class MongoClient {
    constructor() {
        this.userModel = userModel_1.default;
        this.chatModel = chatModel_1.default;
        this.client = mongoose_1.default;
    }
    static getInstance() {
        if (!MongoClient.instance) {
            MongoClient.instance = new MongoClient();
        }
        return MongoClient.instance;
    }
    async connect(uri) {
        await this.client.connect(uri);
    }
    async disconnect() {
        await this.client.disconnect();
    }
    isAlive() {
        return this.client.connection.readyState === 1;
    }
    getClient() {
        return this.client;
    }
    async createUser(user) {
        return await this.userModel.create(user);
    }
    async createChat(chat) {
        return await this.chatModel.create(chat);
    }
    async findUser(query) {
        return await this.userModel.findOne(query)
            .select("-password")
            .exec();
    }
    async findUsers(query) {
        return await this.userModel.find(query)
            .select("-password")
            .exec();
    }
    async findChat(query) {
        return await this.chatModel.findOne(query)
            .populate({
            path: 'participants',
            select: 'username profilePicture'
        })
            .select("-messages")
            .exec();
    }
    async findChatMessages(query) {
        return await this.chatModel.findOne(query).populate({
            path: 'messages.sender',
            select: 'username profilePicture'
        }).exec();
    }
    async findChats(query) {
        return await this.chatModel.find(query)
            .populate({
            path: 'participants',
            select: 'username profilePicture'
        })
            .select("-messages")
            .exec();
    }
    async addMessageToChat(chatId, message) {
        const updateResult = await this.chatModel.findByIdAndUpdate(chatId, {
            $push: { messages: message },
            $set: { lastMessage: message }
        }, { new: true, useFindAndModify: false });
        return updateResult;
    }
    async getChatLastMessage(chatId) {
        const chat = await this.chatModel.findOne({ _id: chatId })
            .populate({
            path: 'lastMessage.sender',
            select: 'username profilePicture'
        })
            .select('-messages')
            .exec();
        return chat?.lastMessage || null;
    }
    async getMessagesFromChat(chatId, skip, limit) {
        return this.chatModel.findById(chatId, {
            messages: { $slice: [skip, limit] }
        }).select('messages').
            populate({
            path: 'messages.sender',
            select: 'username profilePicture'
        }).exec();
    }
    async updateChat(query, update) {
        await this.chatModel.updateOne(query, update)
            .select("-messages")
            .exec();
    }
    async updateUser(query, update) {
        await this.userModel.updateOne(query, update)
            .exec();
    }
    async deleteChat(query) {
        await this.chatModel.deleteOne(query).exec();
    }
    async deleteChats(query) {
        await this.chatModel.deleteMany(query).exec();
    }
    async deleteUser(query) {
        await this.userModel.deleteOne(query).exec();
    }
}
exports.default = MongoClient.getInstance();
