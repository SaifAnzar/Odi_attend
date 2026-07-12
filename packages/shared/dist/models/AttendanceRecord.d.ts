import mongoose, { Document } from 'mongoose';
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
    date: string;
    shiftSnapshot: {
        name: string;
        startTime: string;
        endTime: string;
    };
    sessions: IPunchSession[];
    status: 'Present' | 'Absent' | 'Late' | 'Half-Day' | 'Off-Day';
    totalMinutesWorked: number;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const AttendanceRecord: mongoose.Model<any, {}, {}, {}, any, any>;
export default AttendanceRecord;
