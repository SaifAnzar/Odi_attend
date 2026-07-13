import mongoose, { Schema, Document } from 'mongoose';

export interface IAppConfig extends Document {
  isWifiLockEnabled: boolean;
  allowedWifiSSID: string;
  createdAt: Date;
  updatedAt: Date;
}

const AppConfigSchema = new Schema<IAppConfig>({
  isWifiLockEnabled: { type: Boolean, required: true, default: false },
  allowedWifiSSID: { type: String, default: "" }
}, {
  timestamps: true
});

export const AppConfig = mongoose.models.AppConfig || mongoose.model<IAppConfig>('AppConfig', AppConfigSchema);
export default AppConfig;
