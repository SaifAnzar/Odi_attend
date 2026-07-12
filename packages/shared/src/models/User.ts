import mongoose, { Schema, Document } from 'mongoose';

export interface IShift {
  name: string;
  startTime: string; // "HH:MM" 24hr format, e.g., "09:00"
  endTime: string;   // "HH:MM" 24hr format, e.g., "18:00"
}

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'Admin' | 'Employee' | 'Intern';
  status: 'Active' | 'Inactive';
  shift: IShift;
  createdAt: Date;
  updatedAt: Date;
}

const ShiftSchema = new Schema<IShift>({
  name: { type: String, required: true, default: 'Standard Shift' },
  startTime: { type: String, required: true, default: '09:00' },
  endTime: { type: String, required: true, default: '18:00' }
}, { _id: false });

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, required: true, enum: ['Admin', 'Employee', 'Intern'], default: 'Employee' },
  status: { type: String, required: true, enum: ['Active', 'Inactive'], default: 'Active' },
  shift: { type: ShiftSchema, required: true, default: () => ({ name: 'Standard Shift', startTime: '09:00', endTime: '18:00' }) }
}, {
  timestamps: true
});

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export default User;
