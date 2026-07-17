const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// Dynamically resolve the shared package
const sharedPath = path.resolve(__dirname, '../packages/shared/dist/index.js');
const shared = require(sharedPath);
const { User, AttendanceRecord, AppConfig, LeaveRequest, ShiftSwapRequest, Notice } = shared;

const API_BASE = 'http://127.0.0.1:3000';

let adminToken = '';
let employeeAToken = '';
let employeeBToken = '';

let employeeAId = '';
let employeeBId = '';

let stats = {
  total: 0,
  passed: 0,
  failed: 0
};

function assert(condition, message) {
  stats.total++;
  if (condition) {
    stats.passed++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    stats.failed++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

async function apiRequest(urlPath, method, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const res = await fetch(`${API_BASE}${urlPath}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // Non-JSON response
  }
  
  return { status: res.status, data };
}

// Get local date representation in IST (YYYY-MM-DD)
function getLocalDateString(date = new Date()) {
  const utcOffset = 5.5; // IST offset
  const localTime = new Date(date.getTime() + utcOffset * 3600000);
  return localTime.toISOString().split('T')[0];
}

async function run() {
  console.log('==================================================');
  console.log('  STARTING ODIZO COMPREHENSIVE API TEST SUITE  ');
  console.log('==================================================\n');

  try {
    // 0. Database initialization & Seeding
    console.log('[0] Resetting and Seeding database...');
    await mongoose.connect('mongodb://127.0.0.1:27017/odi_attend');
    console.log('  Connected to MongoDB successfully.');

    // Clear transactional collections
    await AttendanceRecord.deleteMany({});
    await LeaveRequest.deleteMany({});
    await ShiftSwapRequest.deleteMany({});
    await Notice.deleteMany({});

    // Verify / Upsert default Admin
    const salt = await bcrypt.genSalt(10);
    const adminHash = await bcrypt.hash('admin123', salt);
    let adminUser = await User.findOne({ email: 'admin@odizo.in' });
    if (!adminUser) {
      adminUser = new User({
        name: 'ODIZO Administrator',
        email: 'admin@odizo.in',
        passwordHash: adminHash,
        role: 'Admin',
        status: 'Active'
      });
      await adminUser.save();
    } else {
      adminUser.passwordHash = adminHash;
      adminUser.status = 'Active';
      await adminUser.save();
    }

    // Verify / Upsert Employee A (Amar)
    const amarHash = await bcrypt.hash('amar123', salt);
    let amarUser = await User.findOne({ email: 'amar@gmail.com' });
    if (!amarUser) {
      amarUser = new User({
        name: 'Amar Kumar',
        email: 'amar@gmail.com',
        passwordHash: amarHash,
        role: 'Employee',
        status: 'Active',
        shift: { name: 'Morning Shift', startTime: '09:00', endTime: '18:00' }
      });
      await amarUser.save();
    } else {
      amarUser.passwordHash = amarHash;
      amarUser.status = 'Active';
      amarUser.shift = { name: 'Morning Shift', startTime: '09:00', endTime: '18:00' };
      await amarUser.save();
    }
    employeeAId = amarUser._id.toString();

    // Verify / Upsert Employee B (Akash)
    const akashHash = await bcrypt.hash('akash123', salt);
    let akashUser = await User.findOne({ email: 'akash@gmail.com' });
    if (!akashUser) {
      akashUser = new User({
        name: 'Akash Singh',
        email: 'akash@gmail.com',
        passwordHash: akashHash,
        role: 'Employee',
        status: 'Active',
        shift: { name: 'Night Shift', startTime: '21:00', endTime: '06:00' }
      });
      await akashUser.save();
    } else {
      akashUser.passwordHash = akashHash;
      akashUser.status = 'Active';
      akashUser.shift = { name: 'Night Shift', startTime: '21:00', endTime: '06:00' };
      await akashUser.save();
    }
    employeeBId = akashUser._id.toString();

    // Verify / Upsert Inactive user to test auth blocking
    let inactiveUser = await User.findOne({ email: 'inactive@odizo.in' });
    if (!inactiveUser) {
      inactiveUser = new User({
        name: 'Inactive Staff',
        email: 'inactive@odizo.in',
        passwordHash: amarHash,
        role: 'Employee',
        status: 'Inactive'
      });
      await inactiveUser.save();
    } else {
      inactiveUser.status = 'Inactive';
      await inactiveUser.save();
    }

    console.log('  Database setup completed.\n');

    // ----------------------------------------------------
    // TEST GROUP 1: AUTHENTICATION API
    // ----------------------------------------------------
    console.log('[1] Testing Authentication API...');

    // A. Login Admin
    const loginAdminRes = await apiRequest('/api/auth/login', 'POST', {
      email: 'admin@odizo.in',
      password: 'admin123'
    });
    assert(loginAdminRes.status === 200, 'Admin login status is 200');
    assert(loginAdminRes.data.success === true, 'Admin login response returns success');
    assert(!!loginAdminRes.data.token, 'Admin login response returns a JWT token');
    adminToken = loginAdminRes.data.token;

    // B. Login Employee A
    const loginEmpARes = await apiRequest('/api/auth/login', 'POST', {
      email: 'amar@gmail.com',
      password: 'amar123'
    });
    assert(loginEmpARes.status === 200, 'Employee A login status is 200');
    employeeAToken = loginEmpARes.data.token;

    // C. Login Employee B
    const loginEmpBRes = await apiRequest('/api/auth/login', 'POST', {
      email: 'akash@gmail.com',
      password: 'akash123'
    });
    assert(loginEmpBRes.status === 200, 'Employee B login status is 200');
    employeeBToken = loginEmpBRes.data.token;

    // D. Failure: Wrong Password
    const loginWrongPassword = await apiRequest('/api/auth/login', 'POST', {
      email: 'amar@gmail.com',
      password: 'wrongpassword'
    });
    assert(loginWrongPassword.status === 401, 'Login with wrong password rejected with 401');

    // E. Failure: Inactive User
    const loginInactive = await apiRequest('/api/auth/login', 'POST', {
      email: 'inactive@odizo.in',
      password: 'amar123'
    });
    assert(loginInactive.status === 403, 'Login of inactive account rejected with 403');
    console.log('');

    // ----------------------------------------------------
    // TEST GROUP 2: USER MANAGEMENT API (Admin Only)
    // ----------------------------------------------------
    console.log('[2] Testing User CRUD API...');

    // A. Create User (Success)
    const randomEmail = `test_${Date.now()}@odizo.in`;
    const createUserRes = await apiRequest('/api/users', 'POST', {
      name: 'Test Intern',
      email: randomEmail,
      password: 'internpassword',
      role: 'Intern',
      status: 'Active',
      shift: { name: 'Standard Shift', startTime: '09:00', endTime: '18:00' }
    }, adminToken);
    assert(createUserRes.status === 201, 'Admin can create user (status 201)');
    assert(createUserRes.data.user.email === randomEmail, 'Created user email matches input');
    const createdUserId = createUserRes.data.user._id;

    // B. Create User (Failure: Duplicate Email)
    const createUserDuplicate = await apiRequest('/api/users', 'POST', {
      name: 'Duplicate User',
      email: 'amar@gmail.com',
      password: 'somepassword',
      role: 'Employee'
    }, adminToken);
    assert(createUserDuplicate.status === 409, 'Duplicate user creation rejected with 409');

    // C. Get All Users (Admin role verified)
    const getAllUsersRes = await apiRequest('/api/users', 'GET', null, adminToken);
    assert(getAllUsersRes.status === 200, 'Admin can fetch all users (status 200)');
    assert(getAllUsersRes.data.users.length >= 3, 'Fetch all users returns the created users');

    const getAllUsersUnauthorized = await apiRequest('/api/users', 'GET', null, employeeAToken);
    assert(getAllUsersUnauthorized.status === 403, 'Employee cannot list all users (status 403)');

    // D. Update User (PUT)
    const updateUserRes = await apiRequest(`/api/users/${createdUserId}`, 'PUT', {
      name: 'Updated Test Intern',
      role: 'Intern'
    }, adminToken);
    assert(updateUserRes.status === 200, 'Admin can update user details');
    assert(updateUserRes.data.user.name === 'Updated Test Intern', 'Updated user details match updated name');

    // E. Delete User (DELETE)
    const deleteUserRes = await apiRequest(`/api/users/${createdUserId}`, 'DELETE', null, adminToken);
    assert(deleteUserRes.status === 200, 'Admin can delete user');

    // F. Colleague List
    const colleaguesRes = await apiRequest('/api/users/colleagues', 'GET', null, employeeAToken);
    assert(colleaguesRes.status === 200, 'Employee can get colleague list');
    const colleagues = colleaguesRes.data.colleagues;
    const hasSelf = colleagues.some(c => c._id === employeeAId);
    const hasColleagueB = colleagues.some(c => c._id === employeeBId);
    assert(!hasSelf, 'Colleague list excludes the logged-in user');
    assert(hasColleagueB, 'Colleague list includes other active employees');
    console.log('');

    // ----------------------------------------------------
    // TEST GROUP 3: WIFI SETTINGS API
    // ----------------------------------------------------
    console.log('[3] Testing Wi-Fi Settings API...');

    // A. Get Settings
    const getWifiRes = await apiRequest('/api/settings/wifi', 'GET', null, employeeAToken);
    assert(getWifiRes.status === 200, 'Employees can fetch global wifi settings');

    // B. Save Settings (Unauthorized)
    const saveWifiUnauthorized = await apiRequest('/api/settings/wifi', 'POST', {
      isWifiLockEnabled: true,
      allowedWifiSSID: 'Office_Premium'
    }, employeeAToken);
    assert(saveWifiUnauthorized.status === 403, 'Employee cannot update global Wi-Fi settings');

    // C. Save Settings (Admin authorized)
    const saveWifiRes = await apiRequest('/api/settings/wifi', 'POST', {
      isWifiLockEnabled: true,
      allowedWifiSSID: 'Office_Premium'
    }, adminToken);
    assert(saveWifiRes.status === 200, 'Admin can enable Wi-Fi lock and set allowed SSID');
    console.log('');

    // ----------------------------------------------------
    // TEST GROUP 4: ATTENDANCE API & SOFT FALLBACK
    // ----------------------------------------------------
    console.log('[4] Testing Attendance API & Wi-Fi Lock Flagging...');

    // A. Punch In with wrong SSID -> Checks if flagged (Soft Fallback)
    const todayDateStr = getLocalDateString();
    const punchWrongSsid = await apiRequest('/api/attendance', 'POST', {
      type: 'Check-In',
      location: { latitude: 12.9716, longitude: 77.5946, address: 'Bangalore Office' },
      deviceInfo: 'Test Device Mobile',
      ssid: 'Unknown_Public_SSID',
      isFlagged: true,
      flagReason: 'SSID mismatch on device'
    }, employeeAToken);

    assert(punchWrongSsid.status === 200, 'Check-In accepted under wrong SSID (Soft Fallback)');
    const record = punchWrongSsid.data.record;
    assert(record.isFlagged === true, 'Record is flagged due to SSID mismatch');
    assert(record.status === 'Pending Approval', 'Record status is set to Pending Approval');

    // B. Double check-in verification
    const punchDoubleCheckIn = await apiRequest('/api/attendance', 'POST', {
      type: 'Check-In',
      location: { latitude: 12.9716, longitude: 77.5946, address: 'Bangalore Office' },
      deviceInfo: 'Test Device Mobile',
      ssid: 'Unknown_Public_SSID'
    }, employeeAToken);
    assert(punchDoubleCheckIn.status === 400, 'Double check-in rejected with 400');

    // C. Punch Out
    // Simulate time difference by updating check-in time in database to 2 hours ago
    const dbRecord = await AttendanceRecord.findById(record._id);
    dbRecord.sessions[0].checkIn = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await dbRecord.save();

    const punchOutRes = await apiRequest('/api/attendance', 'POST', {
      type: 'Check-Out',
      location: { latitude: 12.9716, longitude: 77.5946, address: 'Bangalore Office' },
      deviceInfo: 'Test Device Mobile',
      ssid: 'Unknown_Public_SSID',
      completedTasks: ['Task A completed', 'Tested API endpoints']
    }, employeeAToken);

    assert(punchOutRes.status === 200, 'Check-Out completes successfully');
    const recordOut = punchOutRes.data.record;
    assert(recordOut.totalMinutesWorked >= 115 && recordOut.totalMinutesWorked <= 125, 'Total minutes worked calculated correctly (~120 mins)');
    assert(recordOut.completedTasks.includes('Task A completed'), 'Completed tasks saved');

    // D. Review Attendance Record (Admin Approves)
    const reviewRes = await apiRequest(`/api/attendance/${record._id}/review`, 'PATCH', {
      status: 'Approved'
    }, adminToken);
    assert(reviewRes.status === 200, 'Admin can review and approve flagged record');
    assert(reviewRes.data.record.status === 'Approved', 'Record status transitioned to Approved');
    assert(reviewRes.data.record.isFlagged === false, 'Flag cleared upon approval');
    console.log('');

    // ----------------------------------------------------
    // TEST GROUP 5: LEAVES & WFH INTEGRATION
    // ----------------------------------------------------
    console.log('[5] Testing Leaves, WFH, & WFH-Wi-Fi Integration...');

    // A. Apply for WFH
    const wfhApplyRes = await apiRequest('/api/leaves', 'POST', {
      startDate: todayDateStr,
      endDate: todayDateStr,
      reason: 'Home quarantine or work from home',
      requestType: 'WFH'
    }, employeeAToken);
    assert(wfhApplyRes.status === 201, 'Employee can submit WFH request');
    const wfhId = wfhApplyRes.data.leaveRequest._id;

    // B. Admin reviews and approves WFH
    const wfhReview = await apiRequest(`/api/leaves/${wfhId}/review`, 'PATCH', {
      status: 'Approved',
      adminRemarks: 'Approved for testing'
    }, adminToken);
    assert(wfhReview.status === 200, 'Admin can approve WFH request');

    // C. Clean today's attendance logs to test WFH-Wi-Fi check override
    await AttendanceRecord.deleteMany({});

    // D. Punch in with wrong SSID while WFH is approved
    const punchWfhIn = await apiRequest('/api/attendance', 'POST', {
      type: 'Check-In',
      location: { latitude: 12.9716, longitude: 77.5946 },
      deviceInfo: 'Home laptop',
      ssid: 'Home_Wifi_Router',
      isFlagged: true,
      flagReason: 'SSID mismatch (Home router)'
    }, employeeAToken);

    assert(punchWfhIn.status === 200, 'Check-In successful');
    const wfhRecord = punchWfhIn.data.record;
    assert(wfhRecord.isFlagged === false, 'WFH status overrides Wi-Fi restriction (not flagged)');
    assert(wfhRecord.status === 'Approved', 'Record is auto-approved under WFH');
    assert(wfhRecord.isWFH === true, 'Attendance record tracks isWFH: true');
    console.log('');

    // ----------------------------------------------------
    // TEST GROUP 6: SHIFT SWAPPING INTEGRATION
    // ----------------------------------------------------
    console.log('[6] Testing Shift Swapping API & Timings Snapshot...');

    // A. Clean up database records
    await AttendanceRecord.deleteMany({});
    
    // B. Employee A requests a shift swap with Employee B for today
    const swapReqRes = await apiRequest('/api/swaps', 'POST', {
      targetUserId: employeeBId,
      swapDate: todayDateStr
    }, employeeAToken);
    assert(swapReqRes.status === 201, 'Employee A can request shift swap with Employee B');
    const swapId = swapReqRes.data.swap._id;

    // C. Employee B accepts the swap (transition to Pending Admin)
    const swapAcceptRes = await apiRequest(`/api/swaps/${swapId}/review`, 'PATCH', {
      status: 'Pending Admin'
    }, employeeBToken);
    assert(swapAcceptRes.status === 200, 'Employee B accepts shift swap');
    assert(swapAcceptRes.data.swap.status === 'Pending Admin', 'Swap status transitioned to Pending Admin');

    // D. Admin approves the swap (finalizes swap)
    const swapApproveRes = await apiRequest(`/api/swaps/${swapId}/review`, 'PATCH', {
      status: 'Approved',
      adminRemarks: 'Swapped shift approved by admin'
    }, adminToken);
    assert(swapApproveRes.status === 200, 'Admin approves shift swap');
    assert(swapApproveRes.data.swap.status === 'Approved', 'Swap status finalized to Approved');

    // E. Employee A checks in, should snapshot Employee B's shift (Night Shift) instead of A's (Morning Shift)
    const punchSwapCheckIn = await apiRequest('/api/attendance', 'POST', {
      type: 'Check-In',
      location: { latitude: 12.9716, longitude: 77.5946 },
      ssid: 'Office_Premium' // SSID matches Wi-Fi lock
    }, employeeAToken);

    assert(punchSwapCheckIn.status === 200, 'Punch in after shift swap succeeds');
    const swapCheckInRecord = punchSwapCheckIn.data.record;
    assert(swapCheckInRecord.shiftSnapshot.name.includes('Swapped') && swapCheckInRecord.shiftSnapshot.name.includes('Night Shift'), 'Active shift snapshot correctly uses swapped colleague\'s shift');
    console.log('');

    // ----------------------------------------------------
    // TEST GROUP 7: NOTICES API
    // ----------------------------------------------------
    console.log('[7] Testing Notices API...');

    // A. Create Notice (Admin)
    const createNoticeRes = await apiRequest('/api/notices', 'POST', {
      title: 'Company Holiday',
      content: 'Independence Day Holiday announced.',
      type: 'Holiday'
    }, adminToken);
    assert(createNoticeRes.status === 201, 'Admin can publish notices (status 201)');
    const noticeId = createNoticeRes.data.notice._id;

    // B. Fetch Notices (Employee)
    const getNoticesRes = await apiRequest('/api/notices', 'GET', null, employeeAToken);
    assert(getNoticesRes.status === 200, 'Employees can fetch notices list');
    assert(getNoticesRes.data.notices.length > 0, 'Fetched notices list contains the new notice');

    // C. Acknowledge Notice
    const ackRes = await apiRequest(`/api/notices/${noticeId}/acknowledge`, 'PATCH', null, employeeAToken);
    assert(ackRes.status === 200, 'Employee can acknowledge notice');
    assert(ackRes.data.notice.acknowledgedBy.includes(employeeAId), 'Acknowledged list contains Employee A\'s ID');

    // D. Delete Notice (Admin)
    const deleteNoticeRes = await apiRequest(`/api/notices/${noticeId}`, 'DELETE', null, adminToken);
    assert(deleteNoticeRes.status === 200, 'Admin can delete notices');
    console.log('');

    // ----------------------------------------------------
    // FINAL REPORT SUMMARY
    // ----------------------------------------------------
    console.log('==================================================');
    console.log('              TEST RUN COMPLETED                 ');
    console.log('==================================================');
    console.log(`Total assertions run: ${stats.total}`);
    console.log(`Passed: ${stats.passed}`);
    console.log(`Failed: ${stats.failed}`);
    console.log('==================================================\n');

    await mongoose.disconnect();
    
    if (stats.failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal test runner error:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

run();
