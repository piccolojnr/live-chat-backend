import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage {
    sender: string;
    message: string;
    timestamp: Date;
}


export interface IChat extends Document {
    participants: string[];
    messages: IMessage[];
}

const ChatSchema: Schema = new Schema({
    participants: [{ type: String, required: true }],
    messages: [{
        sender: { type: String, required: true },
        message: { type: String, required: true },
        timestamp: { type: Date, required: true }
    }]
});

export default mongoose.model<IChat>('Chat', ChatSchema);