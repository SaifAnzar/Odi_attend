import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILeaveRequest extends Document {
  userId: Types.ObjectId;
  startDate: Date;
  endDate: Date;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestType: 'Leave' | 'WFH';
  adminRemarks: string;
  appliedOn: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveRequestSchema = new Schema<ILeaveRequest>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  requestType: { type: String, enum: ['Leave', 'WFH'], default: 'Leave' },
  adminRemarks: { type: String, default: "" },
  appliedOn: { type: Date, default: Date.now }
}, {
  timestamps: true
});

export const LeaveRequest = mongoose.models.LeaveRequest || mongoose.model<ILeaveRequest>('LeaveRequest', LeaveRequestSchema);
export default LeaveRequest;
