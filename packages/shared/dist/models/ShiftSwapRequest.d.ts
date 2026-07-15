import mongoose, { Document, Types } from 'mongoose';
export interface IShiftSwapRequest extends Document {
    requesterId: Types.ObjectId;
    targetUserId: Types.ObjectId;
    swapDate: Date;
    status: 'Pending Target' | 'Pending Admin' | 'Approved' | 'Rejected';
    adminRemarks?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ShiftSwapRequest: mongoose.Model<any, {}, {}, {}, any, any>;
export default ShiftSwapRequest;
