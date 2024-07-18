import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
    to: string;
    from: string;
    message: string;
    timestamp: Date;
}

export interface IPublicMessage {
    _id?: string;
    to: string;
    from: string;
    message: string;
    timestamp: Date;
}

const MessageSchema: Schema = new Schema({
    to: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    from: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, required: true }
});

MessageSchema.index({ timestamp: -1 });

export default mongoose.model<IMessage>('Message', MessageSchema);