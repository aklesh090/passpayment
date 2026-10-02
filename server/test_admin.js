const axios = require('axios');
const mongoose = require('mongoose');
const env = require('./src/config/env');

const BASE_URL = `http://localhost:${env.PORT || 5000}/api`;

async function runAdminTests() {
  console.log('=== STARTING ADMIN INTEGRATION TESTS ===\n');
  let passed = 0;
  let failed = 0;

  const runTest = async (name, fn) => {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (e) {
      console.log(`❌ [FAIL] ${name}`);
      console.log('   Error:', e.response?.data || e.message);
      failed++;
    }
  };

  // 1. Create Admin User
  const adminEmail = `admin_${Date.now()}@test.com`;
  let adminToken;
  await runTest('1. Create Admin User', async () => {
    const reg = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Admin User',
      email: adminEmail,
      phone: '8888888888',
      password: 'Password123!'
    });
    adminToken = reg.data.accessToken;

    // Manually set role to admin in DB
    await mongoose.connect(env.MONGODB_URI);
    const User = require('./src/models/User');
    await User.updateOne({ email: adminEmail }, { role: 'admin' });
    await mongoose.disconnect();
  });

  const auth = { Authorization: `Bearer ${adminToken}` };

  // 2. Fetch Dashboard
  await runTest('2. GET /api/admin/dashboard', async () => {
    const res = await axios.get(`${BASE_URL}/admin/dashboard`, { headers: auth });
    if (!res.data.dashboard) throw new Error('No dashboard data returned');
    if (typeof res.data.dashboard.totalRevenue !== 'number') throw new Error('Missing totalRevenue');
  });

  // 3. Fetch Users
  await runTest('3. GET /api/admin/users', async () => {
    const res = await axios.get(`${BASE_URL}/admin/users`, { headers: auth });
    if (!res.data.users) throw new Error('No users returned');
  });

  // 4. Fetch Tickets
  let testTicketId = null;
  await runTest('4. GET /api/admin/tickets', async () => {
    const res = await axios.get(`${BASE_URL}/admin/tickets`, { headers: auth });
    if (!res.data.tickets) throw new Error('No tickets returned');
    if (res.data.tickets.length > 0) {
      testTicketId = res.data.tickets[0]._id;
    }
  });

  // 5. Create Pass Type
  let passId = null;
  await runTest('5. POST /api/passes (Admin Create Pass)', async () => {
    const res = await axios.post(`${BASE_URL}/passes`, {
      name: 'Admin Test Pass',
      slug: `admin-pass-${Date.now()}`,
      description: 'Test',
      category: 'daily',
      price: 100,
      totalQuantity: 50,
      applicableDays: [1]
    }, { headers: auth });
    passId = res.data.pass._id;
  });

  // 6. Disable Pass Type
  await runTest('6. PUT /api/passes/:id (Admin Update Pass)', async () => {
    if (!passId) throw new Error('No passId');
    const res = await axios.put(`${BASE_URL}/passes/${passId}`, {
      isActive: false
    }, { headers: auth });
    if (res.data.pass.isActive !== false) throw new Error('Failed to update pass');
  });

  console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runAdminTests();
