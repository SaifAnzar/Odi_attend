import mongoose, { Schema, Document } from 'mongoose';

export interface IShift {
  name: string;
  startTime: string; // "HH:MM" 24hr format, e.g., "09:00"
  endTime: string;   // "HH:MM" 24hr format, e.g., "18:00"
}

export type UserRole = 'ADMIN' | 'EMPLOYEE' | 'INTERN' | 'Admin' | 'Employee' | 'Intern';
export type WorkMode = 'On-Site' | 'Remote' | 'Hybrid';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  workMode: WorkMode;
  status: 'Active' | 'Inactive';
  shift: IShift;
  baseSalary?: number;
  expoPushToken?: string | null;
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
  role: { type: String, required: true, enum: ['Admin', 'Employee', 'Intern', 'ADMIN', 'EMPLOYEE', 'INTERN'], default: 'EMPLOYEE' },
  workMode: { type: String, required: true, enum: ['On-Site', 'Remote', 'Hybrid'], default: 'On-Site' },
  status: { type: String, required: true, enum: ['Active', 'Inactive'], default: 'Active' },
  shift: { type: ShiftSchema, required: true, default: () => ({ name: 'Standard Shift', startTime: '09:00', endTime: '18:00' }) },
  baseSalary: { type: Number, default: 65000 },
  expoPushToken: { type: String, default: null }
}, {
  timestamps: true
});

if (mongoose.models.User && !mongoose.models.User.schema.path('workMode')) {
  delete mongoose.models.User;
}

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export default User;
