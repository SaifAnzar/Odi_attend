import mongoose, { Document, Types } from 'mongoose';
export interface INotice extends Document {
    title: string;
    content: string;
    type: 'Info' | 'Warning' | 'Holiday';
    acknowledgedBy: Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}
export declare const Notice: mongoose.Model<any, {}, {}, {}, any, any>;
export default Notice;
