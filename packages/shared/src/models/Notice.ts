import mongoose, { Schema, Document, Types } from 'mongoose';

export interface INotice extends Document {
  title: string;
  content: string;
  type: 'Info' | 'Warning' | 'Holiday';
  acknowledgedBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const NoticeSchema = new Schema<INotice>({
  title: { type: String, required: true },
  content: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['Info', 'Warning', 'Holiday'], 
    default: 'Info' 
  },
  acknowledgedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, {
  timestamps: true
});

export const Notice = mongoose.models.Notice || mongoose.model<INotice>('Notice', NoticeSchema);
export default Notice;
