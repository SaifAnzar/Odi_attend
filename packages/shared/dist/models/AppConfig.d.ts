import mongoose, { Document } from 'mongoose';
export interface IAppConfig extends Document {
    isWifiLockEnabled: boolean;
    allowedWifiSSID: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const AppConfig: mongoose.Model<any, {}, {}, {}, any, any>;
export default AppConfig;
