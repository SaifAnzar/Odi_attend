const mongoose = require('mongoose');
const path = require('path');

// Dynamically resolve the shared package
const sharedPath = path.resolve(__dirname, '../packages/shared/dist/index.js');
const shared = require(sharedPath);
const { AttendanceRecord, LeaveRequest, ShiftSwapRequest, Notice } = shared;

async function clean() {
  try {
    console.log('[CLEANUP] Connecting to MongoDB...');
    await mongoose.connect('mongodb://127.0.0.1:27017/odi_attend');
    
    console.log('[CLEANUP] Deleting test transactional records...');
    const resultAttendance = await AttendanceRecord.deleteMany({});
    const resultLeaves = await LeaveRequest.deleteMany({});
    const resultSwaps = await ShiftSwapRequest.deleteMany({});
    const resultNotices = await Notice.deleteMany({});

    console.log(`  - Deleted ${resultAttendance.deletedCount} attendance records`);
    console.log(`  - Deleted ${resultLeaves.deletedCount} leave/wfh requests`);
    console.log(`  - Deleted ${resultSwaps.deletedCount} shift swap requests`);
    console.log(`  - Deleted ${resultNotices.deletedCount} notice announcements`);

    await mongoose.disconnect();
    console.log('[CLEANUP] Completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[CLEANUP] Failed:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

clean();
