import mongoose, { Schema, Document } from 'mongoose';

export interface ILocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface IPunchSession {
  checkIn: Date;
  checkOut?: Date;
  checkInLocation: ILocation;
  checkOutLocation?: ILocation;
  checkInDevice?: string;
  checkOutDevice?: string;
}

export interface IAttendanceRecord extends Document {
  userId: mongoose.Types.ObjectId;
  date: string; // Format YYYY-MM-DD to avoid timezone and local time errors
  shiftSnapshot: {
    name: string;
    startTime: string;
    endTime: string;
  };
  sessions: IPunchSession[];
  attendanceStatus: 'Present' | 'Absent' | 'Late' | 'Half-Day' | 'Off-Day';
  totalMinutesWorked: number; // calculated sum of all completed sessions (in minutes)
  isFlagged: boolean;
  flagReason?: string;
  status: 'Approved' | 'Pending Approval' | 'Rejected';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LocationSchema = new Schema<ILocation>({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  address: { type: String }
}, { _id: false });

const PunchSessionSchema = new Schema<IPunchSession>({
  checkIn: { type: Date, required: true },
  checkOut: { type: Date },
  checkInLocation: { type: LocationSchema, required: true },
  checkOutLocation: { type: LocationSchema },
  checkInDevice: { type: String },
  checkOutDevice: { type: String }
}, { _id: false });

const AttendanceRecordSchema = new Schema<IAttendanceRecord>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: String, required: true, index: true }, // e.g. "2026-07-12"
  shiftSnapshot: {
    name: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true }
  },
  sessions: [PunchSessionSchema],
  attendanceStatus: { 
    type: String, 
    required: true, 
    enum: ['Present', 'Absent', 'Late', 'Half-Day', 'Off-Day'], 
    default: 'Present' 
  },
  totalMinutesWorked: { type: Number, required: true, default: 0 },
  isFlagged: { type: Boolean, default: false },
  flagReason: { type: String, default: "" },
  status: {
    type: String,
    required: true,
    enum: ['Approved', 'Pending Approval', 'Rejected'],
    default: 'Approved'
  },
  notes: { type: String }
}, {
  timestamps: true
});

// Ensure only one attendance log exists per user per calendar day
AttendanceRecordSchema.index({ userId: 1, date: 1 }, { unique: true });

export const AttendanceRecord = mongoose.models.AttendanceRecord || mongoose.model<IAttendanceRecord>('AttendanceRecord', AttendanceRecordSchema);
export default AttendanceRecord;
