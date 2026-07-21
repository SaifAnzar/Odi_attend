const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../apps/admin/.env') });

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error("MONGODB_URI is not defined.");
  process.exit(1);
}

// Define Schemas
const LocationSchema = new mongoose.Schema({
  latitude: Number,
  longitude: Number,
  address: String
}, { _id: false });

const PunchSessionSchema = new mongoose.Schema({
  checkIn: Date,
  checkOut: Date,
  checkInLocation: LocationSchema,
  checkOutLocation: LocationSchema,
  checkInDevice: String,
  checkOutDevice: String
}, { _id: false });

const AttendanceRecordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: String,
  shiftSnapshot: {
    name: String,
    startTime: String,
    endTime: String
  },
  sessions: [PunchSessionSchema],
  attendanceStatus: String,
  totalMinutesWorked: Number,
  isFlagged: Boolean,
  flagReason: String,
  isWFH: Boolean,
  status: String
});

const UserSchema = new mongoose.Schema({
  name: String,
  role: String,
  email: String
});

const AttendanceRecord = mongoose.models.AttendanceRecord || mongoose.model('AttendanceRecord', AttendanceRecordSchema);
const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function run() {
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB successfully.");

    const user = await User.findOne({ name: /Amar/i });
    if (!user) {
      console.log("User Amar not found.");
      return;
    }
    console.log("User found:", { id: user._id, name: user.name });

    const records = await AttendanceRecord.find({ userId: user._id }).sort({ date: -1 });
    console.log(`\nFound ${records.length} attendance records:`);
    records.forEach(r => {
      console.log(`- Date: ${r.date} | Status: ${r.status} | WFH: ${r.isWFH} | Flagged: ${r.isFlagged} | Reason: ${r.flagReason}`);
      console.log("  Sessions:", JSON.stringify(r.sessions, null, 2));
    });

  } catch (err) {
    console.error("Error during execution:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
