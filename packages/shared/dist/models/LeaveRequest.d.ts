import mongoose, { Document, Types } from 'mongoose';
export interface ILeaveRequest extends Document {
    userId: Types.ObjectId;
    startDate: Date;
    endDate: Date;
    reason: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    adminRemarks: string;
    appliedOn: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const LeaveRequest: mongoose.Model<any, {}, {}, {}, any, any>;
export default LeaveRequest;
