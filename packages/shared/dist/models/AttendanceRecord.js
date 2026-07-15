"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceRecord = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const LocationSchema = new mongoose_1.Schema({
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    address: { type: String }
}, { _id: false });
const PunchSessionSchema = new mongoose_1.Schema({
    checkIn: { type: Date, required: true },
    checkOut: { type: Date },
    checkInLocation: { type: LocationSchema, required: true },
    checkOutLocation: { type: LocationSchema },
    checkInDevice: { type: String },
    checkOutDevice: { type: String }
}, { _id: false });
const AttendanceRecordSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
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
    isWFH: { type: Boolean, default: false },
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
exports.AttendanceRecord = mongoose_1.default.models.AttendanceRecord || mongoose_1.default.model('AttendanceRecord', AttendanceRecordSchema);
exports.default = exports.AttendanceRecord;
