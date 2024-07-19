import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
    key: string;
    sender: string;
    message: string;
    timestamp: Date;
}

export interface IPublicMessage {
    _id?: string;
    key: string;
    sender: string;
    message: string;
    timestamp: Date;
}

const MessageSchema: Schema = new Schema({
    key: { type: String, required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, required: true }
});

MessageSchema.index({ timestamp: -1 });

export default mongoose.model<IMessage>('Message', MessageSchema);