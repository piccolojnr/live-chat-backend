// import mongoose, { Document, Schema } from 'mongoose';

// export interface IMessage {
//     sender: string;
//     message: string;
//     timestamp: Date;
// }


// export interface IChat extends Document {
//     name: string;
//     participants: string[];
//     messages: IMessage[];
//     lastMessage: IMessage;
// }

// const ChatSchema: Schema = new Schema({
//     name: { type: String, required: true },
//     participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
//     messages: [{
//         sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
//         message: { type: String, required: true },
//         timestamp: { type: Date, required: true }
//     }],
//     lastMessage: {
//         sender: { type: Schema.Types.ObjectId, ref: 'User', },
//         message: { type: String },
//         timestamp: { type: Date },
//     }
// });
// ChatSchema.index({ 'messages.timestamp': -1 });

// ChatSchema.pre<IChat>('save', function (next) {
//     if (this.messages.length > 0)
//         this.lastMessage = this.messages[this.messages.length - 1];
//     // if there are duplicate participants, remove them
//     this.participants = [...new Set(this.participants)];
//     if (this.participants.length < 2) {
//         throw new Error('Invalid chat participants');
//     }
//     next();
// });

// export default mongoose.model<IChat>('Chat', ChatSchema);