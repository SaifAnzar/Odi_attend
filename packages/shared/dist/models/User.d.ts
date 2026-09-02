import mongoose, { Document } from 'mongoose';
export interface IShift {
    name: string;
    startTime: string;
    endTime: string;
}
export type WorkMode = 'On-Site' | 'Remote' | 'Hybrid';
export interface IUser extends Document {
    name: string;
    email: string;
    passwordHash: string;
    role: 'Admin' | 'Employee' | 'Intern';
    workMode: WorkMode;
    status: 'Active' | 'Inactive';
    shift: IShift;
    baseSalary?: number;
    expoPushToken?: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export declare const User: mongoose.Model<any, {}, {}, {}, any, any>;
export default User;
