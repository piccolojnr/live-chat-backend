import mongoose, { Document, Schema } from 'mongoose';
import { IMessage } from './messageModel';

export interface IUser extends Document {
    username: string;
    password: string;
    phone?: string;
    profilePicture?: string;
    bio?: string;
}

export type IPublicUser = Pick<IUser, "username" | "_id" | "phone" | "bio" | "profilePicture"> & { lastMessage?: IMessage }


const UserSchema: Schema = new Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String },
    profilePicture: { type: String },
    bio: { type: String },
});

export default mongoose.model<IUser>('User', UserSchema);
