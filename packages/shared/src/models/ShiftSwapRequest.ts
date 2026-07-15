import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IShiftSwapRequest extends Document {
  requesterId: Types.ObjectId;
  targetUserId: Types.ObjectId;
  swapDate: Date;
  status: 'Pending Target' | 'Pending Admin' | 'Approved' | 'Rejected';
  adminRemarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ShiftSwapRequestSchema = new Schema<IShiftSwapRequest>({
  requesterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  swapDate: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['Pending Target', 'Pending Admin', 'Approved', 'Rejected'], 
    default: 'Pending Target' 
  },
  adminRemarks: { type: String, default: "" }
}, {
  timestamps: true
});

// Ensure a user doesn't create duplicate requests for the same date with the same colleague
ShiftSwapRequestSchema.index({ requesterId: 1, targetUserId: 1, swapDate: 1 }, { unique: true });

export const ShiftSwapRequest = mongoose.models.ShiftSwapRequest || mongoose.model<IShiftSwapRequest>('ShiftSwapRequest', ShiftSwapRequestSchema);
export default ShiftSwapRequest;
