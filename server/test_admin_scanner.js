const axios = require('axios');
const mongoose = require('mongoose');
const env = require('./src/config/env');

const BASE_URL = `http://localhost:${env.PORT || 5000}/api`;

async function runScannerTests() {
  console.log('=== STARTING SCANNER INTEGRATION TESTS ===\n');
  let passed = 0;
  let failed = 0;

  const runTest = async (name, fn) => {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (e) {
      console.log(`❌ [FAIL] ${name}`);
      console.log('   Error:', e.message);
      failed++;
    }
  };

  // Login as admin
  const res = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'admin_test_scan@test.com',
    password: 'Password123!'
  }).catch(async (e) => {
    // Register if doesn't exist
    const reg = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Scan Admin',
      email: 'admin_test_scan@test.com',
      phone: '8888888887',
      password: 'Password123!'
    });
    // Manually set role to admin
    await mongoose.connect(env.MONGODB_URI);
    const User = require('./src/models/User');
    await User.updateOne({ email: 'admin_test_scan@test.com' }, { role: 'admin' });
    return axios.post(`${BASE_URL}/auth/login`, { email: 'admin_test_scan@test.com', password: 'Password123!' });
  });

  const auth = { Authorization: `Bearer ${res.data.accessToken}` };
  
  await mongoose.connect(env.MONGODB_URI);
  const Ticket = require('./src/models/Ticket');
  const Order = require('./src/models/Order');

  // Reset all tickets for test
  await Ticket.updateMany({}, { status: 'active', checkIns: [] });

  // Let's find an active day pass ticket with order = paid
  let validTicket = await Ticket.findOne({ status: 'active', validDays: { $size: 9 } }).populate('order');
  
  if (!validTicket || validTicket.order.paymentStatus !== 'paid') {
    console.log("No valid ticket with paid order found to scan. Skipping test.");
    await mongoose.disconnect();
    return;
  }

  const validDay = validTicket.validDays[0];
  const token = validTicket.qrToken;

  await runTest('1. Scan valid ticket for the first time', async () => {
    const scanRes = await axios.post(`${BASE_URL}/admin/verify-ticket`, {
      token, day: validDay
    }, { headers: auth });
    if (!scanRes.data.valid) throw new Error(`Ticket should be valid. Reason: ${scanRes.data.reason}`);
  });

  await runTest('2. Scan the SAME ticket on the SAME day', async () => {
    const scanRes = await axios.post(`${BASE_URL}/admin/verify-ticket`, {
      token, day: validDay
    }, { headers: auth });
    if (scanRes.data.valid) throw new Error('Ticket should be marked invalid');
    if (!scanRes.data.reason.includes('ALREADY USED')) throw new Error('Reason should be ALREADY USED');
  });

  await runTest('3. Scan with an out of bounds day (e.g. day 10)', async () => {
    try {
      await axios.post(`${BASE_URL}/admin/verify-ticket`, {
        token, day: 10
      }, { headers: auth });
      throw new Error('Should have thrown 400');
    } catch (e) {
      if (e.response?.status !== 400) throw new Error('Status should be 400');
    }
  });

  await runTest('4. Test completely invalid token', async () => {
    const scanRes = await axios.post(`${BASE_URL}/admin/verify-ticket`, {
      token: 'INVALID_RANDOM_TOKEN_123', day: 1
    }, { headers: auth });
    if (scanRes.data.valid) throw new Error('Ticket should be marked invalid');
    if (scanRes.data.reason !== 'Ticket not found') throw new Error('Reason should be Ticket not found');
  });

  console.log(`\n=== SCANNER RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runScannerTests();
