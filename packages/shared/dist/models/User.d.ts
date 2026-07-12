import mongoose, { Document } from 'mongoose';
export interface IShift {
    name: string;
    startTime: string;
    endTime: string;
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
export declare const User: mongoose.Model<any, {}, {}, {}, any, any>;
export default User;
