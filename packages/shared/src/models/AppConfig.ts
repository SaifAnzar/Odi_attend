import mongoose, { Schema, Document } from 'mongoose';

export interface IAppConfig extends Document {
  isWifiLockEnabled: boolean;
  allowedWifiSSID: string;
  isGeofenceEnabled: boolean;
  officeLatitude: number;
  officeLongitude: number;
  geofenceRadiusMeters: number;
  createdAt: Date;
  updatedAt: Date;
}

const AppConfigSchema = new Schema<IAppConfig>({
  isWifiLockEnabled: { type: Boolean, required: true, default: false },
  allowedWifiSSID: { type: String, default: "" },
  isGeofenceEnabled: { type: Boolean, required: true, default: true },
  officeLatitude: { type: Number, default: 12.9716 },
  officeLongitude: { type: Number, default: 77.5946 },
  geofenceRadiusMeters: { type: Number, default: 100 }
}, {
  timestamps: true
});

export const AppConfig = mongoose.models.AppConfig || mongoose.model<IAppConfig>('AppConfig', AppConfigSchema);
export default AppConfig;
