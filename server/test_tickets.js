const axios = require('axios');
const mongoose = require('mongoose');
const env = require('./src/config/env');
const fs = require('fs');

const BASE_URL = `http://localhost:${env.PORT || 5000}/api`;

async function runTicketTests() {
  console.log('=== STARTING TICKET INTEGRATION TESTS ===\n');
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

  await mongoose.connect(env.MONGODB_URI);
  const PassType = require('./src/models/PassType');
  const User = require('./src/models/User');

  // Setup multiple pass types
  let seasonPass = await PassType.findOne({ slug: 'vip-test-pass' });
  if (!seasonPass) {
    seasonPass = await PassType.create({
      name: 'VIP Season Pass',
      slug: 'vip-test-pass',
      category: 'season',
      applicableDays: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      price: 1499,
      totalQuantity: 100,
      soldQuantity: 0,
      isActive: true
    });
  }

  let dayPass = await PassType.findOne({ slug: 'day-5-pass' });
  if (!dayPass) {
    dayPass = await PassType.create({
      name: 'Day 5 Pass',
      slug: 'day-5-pass',
      category: 'daily',
      applicableDays: [5],
      price: 499,
      totalQuantity: 100,
      soldQuantity: 0,
      isActive: true
    });
  }

  // User 1
  const user1Email = `ticket_user1_${Date.now()}@example.com`;
  const register1 = await axios.post(`${BASE_URL}/auth/register`, {
    name: 'Ticket User One',
    email: user1Email,
    phone: '9999999991',
    password: 'Password123!'
  });
  const token1 = register1.data.accessToken;
  const auth1 = { Authorization: `Bearer ${token1}` };

  // User 2
  const user2Email = `ticket_user2_${Date.now()}@example.com`;
  const register2 = await axios.post(`${BASE_URL}/auth/register`, {
    name: 'Ticket User Two',
    email: user2Email,
    phone: '9999999992',
    password: 'Password123!'
  });
  const token2 = register2.data.accessToken;
  const auth2 = { Authorization: `Bearer ${token2}` };

  let ticketsUser1 = [];

  // Helper to buy and verify tickets using mocked razorpay credentials in dev
  const purchaseTickets = async (passId, quantity, auth) => {
    const orderRes = await axios.post(`${BASE_URL}/orders/create`, { passId, quantity }, { headers: auth });
    const orderData = orderRes.data.data;
    
    // Simulate frontend verify
    const crypto = require('crypto');
    const secret = env.RAZORPAY_KEY_SECRET || 'rangiloraas_secret_key_123456789';
    const mockPaymentId = `pay_mock_${Date.now()}`;
    const bodyToSign = `${orderData.razorpayOrderId}|${mockPaymentId}`;
    const sig = crypto.createHmac('sha256', secret).update(bodyToSign).digest('hex');

    const verifyRes = await axios.post(`${BASE_URL}/payments/verify`, {
      razorpay_order_id: orderData.razorpayOrderId,
      razorpay_payment_id: mockPaymentId,
      razorpay_signature: sig
    }, { headers: auth });

    return verifyRes.data;
  };

  // Test 1: Multiple quantity purchases (Season Pass)
  await runTest('1. Test multiple quantity purchases (2 VIP Season Passes)', async () => {
    const data = await purchaseTickets(seasonPass._id.toString(), 2, auth1);
    
    if (data.tickets.length !== 2) throw new Error(`Expected 2 tickets, got ${data.tickets.length}`);
    if (!data.tickets[0].ticketId.startsWith('RR20-VIP-')) throw new Error(`Invalid ticket ID format: ${data.tickets[0].ticketId}`);
    
    // Valid days check
    if (data.tickets[0].validDays.length !== 9) throw new Error('Season pass should have 9 valid days');
    
    ticketsUser1 = data.tickets;
  });

  // Test 2: Day Pass
  await runTest('2. Test Day Pass purchase', async () => {
    const data = await purchaseTickets(dayPass._id.toString(), 1, auth1);
    
    if (data.tickets.length !== 1) throw new Error(`Expected 1 ticket, got ${data.tickets.length}`);
    if (data.tickets[0].validDays[0] !== 5 || data.tickets[0].validDays.length !== 1) {
      throw new Error(`Expected Day 5 only, got ${data.tickets[0].validDays}`);
    }
    ticketsUser1.push(data.tickets[0]);
  });

  // Test 3: Get tickets list
  await runTest('3. GET /api/tickets list', async () => {
    const res = await axios.get(`${BASE_URL}/tickets`, { headers: auth1 });
    if (res.data.tickets.length !== 3) throw new Error(`Expected 3 tickets in list, got ${res.data.tickets.length}`);
    // QR code should be excluded from list
    if (res.data.tickets[0].qrCode) throw new Error('QR code should not be in list response');
  });

  // Test 4: Get single ticket (includes QR)
  await runTest('4. GET /api/tickets/:id (Single ticket includes QR)', async () => {
    const ticketId = ticketsUser1[0].ticketId;
    const res = await axios.get(`${BASE_URL}/tickets/${ticketId}`, { headers: auth1 });
    
    if (res.data.ticket.ticketId !== ticketId) throw new Error('Ticket ID mismatch');
    if (!res.data.ticket.qrCode) throw new Error('QR code missing from single ticket response');
    if (res.data.ticket.qrCode.includes('password') || res.data.ticket.qrCode.includes('secret')) {
      throw new Error('QR Code data contains sensitive keywords');
    }
  });

  // Test 5: Ownership security check
  await runTest('5. SECURITY: Ownership check (User 2 accessing User 1 ticket)', async () => {
    try {
      const ticketId = ticketsUser1[0].ticketId;
      await axios.get(`${BASE_URL}/tickets/${ticketId}`, { headers: auth2 });
      throw new Error('Should have denied access (403)');
    } catch (e) {
      if (e.response?.status !== 403) throw new Error(`Expected 403, got ${e.response?.status}`);
    }
  });

  // Test 6: Invalid ticket access
  await runTest('6. GET /api/tickets/:id (Invalid ticket ID)', async () => {
    try {
      await axios.get(`${BASE_URL}/tickets/RR20-INVALID-999`, { headers: auth1 });
      throw new Error('Should have failed (404)');
    } catch (e) {
      if (e.response?.status !== 404) throw new Error(`Expected 404, got ${e.response?.status}`);
    }
  });

  // Test 7: PDF Generation Download
  await runTest('7. GET /api/tickets/:id/download (PDF generation)', async () => {
    const ticketId = ticketsUser1[0].ticketId;
    const res = await axios.get(`${BASE_URL}/tickets/${ticketId}/download`, { 
      headers: auth1,
      responseType: 'arraybuffer'
    });
    
    if (res.headers['content-type'] !== 'application/pdf') {
      throw new Error(`Expected application/pdf, got ${res.headers['content-type']}`);
    }
    
    // PDF magic number check
    const header = res.data.slice(0, 4).toString('utf8');
    if (header !== '%PDF') throw new Error('Buffer is not a valid PDF file');
    
    fs.writeFileSync(`test_pass_${ticketId}.pdf`, res.data);
    console.log(`      -> Wrote test PDF to test_pass_${ticketId}.pdf`);
  });

  // Test 8: PDF Security Check
  await runTest('8. SECURITY: Ownership check on PDF download', async () => {
    try {
      const ticketId = ticketsUser1[0].ticketId;
      await axios.get(`${BASE_URL}/tickets/${ticketId}/download`, { headers: auth2 });
      throw new Error('Should have denied access (403)');
    } catch (e) {
      if (e.response?.status !== 403) throw new Error(`Expected 403, got ${e.response?.status}`);
    }
  });

  console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTicketTests();
