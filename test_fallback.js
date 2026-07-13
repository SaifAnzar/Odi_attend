const http = require('http');

const API_BASE = 'http://127.0.0.1:3000';

function post(url, data, token = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const bodyStr = JSON.stringify(data);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(bodyStr)
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'POST',
      headers
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function patch(url, data, token = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const bodyStr = JSON.stringify(data);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(bodyStr)
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'PATCH',
      headers
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function get(url, token = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'GET',
      headers
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  try {
    console.log('--- START SOFT FALLBACK TEST ---');

    // 1. Login as Admin
    console.log('\n1. Logging in as Admin...');
    const adminLogin = await post(`${API_BASE}/api/auth/login`, {
      email: 'admin@odizo.in',
      password: 'admin123'
    });
    const adminToken = adminLogin.data.token;
    console.log('Admin logged in!');

    // Get current settings to restore later
    const currentSettings = await get(`${API_BASE}/api/settings/wifi`, adminToken);
    const initialConfig = currentSettings.data.config;

    // 2. Enable Wi-Fi Lock with SSID "Office_Premium"
    console.log('\n2. Enabling Wi-Fi lock with SSID "Office_Premium"...');
    await post(`${API_BASE}/api/settings/wifi`, {
      isWifiLockEnabled: true,
      allowedWifiSSID: 'Office_Premium'
    }, adminToken);
    console.log('Wi-Fi lock enabled!');

    // 3. Login as Employee
    console.log('\n3. Logging in as Employee...');
    const employeeLogin = await post(`${API_BASE}/api/auth/login`, {
      email: 'amar@gmail.com',
      password: 'amar123'
    });
    const employeeToken = employeeLogin.data.token;
    console.log('Employee logged in!');

    // First delete today's existing records if any, to allow clean check-in
    console.log('Cleaning up existing records...');
    const mongoose = require('mongoose');
    await mongoose.connect('mongodb://127.0.0.1:27017/odi_attend');
    await mongoose.connection.db.collection('attendancerecords').deleteMany({});
    await mongoose.disconnect();

    // 4. Punch In with wrong SSID ("Home_Guest") simulating soft fallback
    console.log('\n4. Punching in with wrong SSID ("Home_Guest") representing soft fallback...');
    const punchFallback = await post(`${API_BASE}/api/attendance`, {
      type: 'Check-In',
      location: { latitude: 12.9716, longitude: 77.5946, address: 'Fallback Site' },
      deviceInfo: 'Fallback Test Script',
      ssid: 'Home_Guest',
      isFlagged: true,
      flagReason: 'Wi-Fi mismatch or network unavailable'
    }, employeeToken);

    console.log('Response Status:', punchFallback.status);
    console.log('Response Body:', punchFallback.data);
    
    if (punchFallback.status !== 200) {
      throw new Error(`Expected status 200, but got ${punchFallback.status}`);
    }
    const record = punchFallback.data.record;
    if (!record.isFlagged || record.status !== 'Pending Approval') {
      throw new Error(`Expected record to be flagged and Pending Approval. Got isFlagged: ${record.isFlagged}, status: ${record.status}`);
    }
    console.log('Verification: Punch-in was accepted, but successfully flagged and marked as Pending Approval!');

    // 5. Admin reviews and Approves the record
    console.log(`\n5. Admin reviewing record (ID: ${record._id}) to Approve...`);
    const reviewApproved = await patch(`${API_BASE}/api/attendance/${record._id}/review`, {
      status: 'Approved'
    }, adminToken);

    console.log('Review Response Status:', reviewApproved.status);
    console.log('Review Response Body:', reviewApproved.data);

    if (reviewApproved.status !== 200) {
      throw new Error(`Expected review status 200, but got ${reviewApproved.status}`);
    }
    const updatedRecord = reviewApproved.data.record;
    if (updatedRecord.isFlagged || updatedRecord.status !== 'Approved') {
      throw new Error(`Expected record to be unflagged and Approved. Got isFlagged: ${updatedRecord.isFlagged}, status: ${updatedRecord.status}`);
    }
    console.log('Verification: Admin was successfully able to approve and clear the flag!');

    // 6. Restore original settings
    console.log('\n6. Restoring original settings...');
    await post(`${API_BASE}/api/settings/wifi`, {
      isWifiLockEnabled: initialConfig.isWifiLockEnabled,
      allowedWifiSSID: initialConfig.allowedWifiSSID
    }, adminToken);
    console.log('Restored settings successfully!');

    console.log('\n--- ALL FALLBACK TESTS PASSED SUCCESSFULLY! ---');
  } catch (err) {
    console.error('\n❌ Fallback test failed:', err.message);
    process.exit(1);
  }
}

main();
