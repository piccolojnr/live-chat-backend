import mongoose, { Document, Schema } from 'mongoose';
import { IChat } from './chatModel';

export interface IUser extends Document {
    username: string;
    password: string;
    phone?: string;
    profilePicture?: string;
    bio?: string;
    chats?: IChat[];
}

const UserSchema: Schema = new Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String },
    profilePicture: { type: String },
    bio: { type: String },
    chats: [{ type: Schema.Types.ObjectId, ref: 'Chat' }]
});

export default mongoose.model<IUser>('User', UserSchema);
