import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    username: string;
    password: string;
    phone?: string;
    profilePicture?: string;
    bio?: string;
}

const UserSchema: Schema = new Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String },
    profilePicture: { type: String },
    bio: { type: String }
});

export default mongoose.model<IUser>('User', UserSchema);
