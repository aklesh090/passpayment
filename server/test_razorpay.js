 const axios = require('axios');
const crypto = require('crypto');
const mongoose = require('mongoose');
const env = require('./src/config/env');

const BASE_URL = `http://localhost:${env.PORT || 5000}/api`;

async function runRazorpayIntegrationTest() {
  console.log('=== STARTING RAZORPAY INTEGRATION TESTS ===\n');
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

  // Connect to DB to set up mock PassType and User data
  await mongoose.connect(env.MONGODB_URI);
  const PassType = require('./src/models/PassType');
  const User = require('./src/models/User');
  const Order = require('./src/models/Order');
  const Ticket = require('./src/models/Ticket');

  // Create or get test PassType
  let testPass = await PassType.findOne({ slug: 'vip-test-pass' });
  if (!testPass) {
    testPass = await PassType.create({
      name: 'VIP Test Pass',
      slug: 'vip-test-pass',
      category: 'season',
      applicableDays: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      price: 1499,
      totalQuantity: 100,
      soldQuantity: 0,
      perks: ['VIP Access', 'Free Food'],
      isActive: true
    });
  }

  // Create test User & get JWT token
  const testEmail = `razorpay_user_${Date.now()}@example.com`;
  const registerRes = await axios.post(`${BASE_URL}/auth/register`, {
    name: 'Razorpay Test User',
    email: testEmail,
    phone: '9876543210',
    password: 'Password123!'
  });
  const token = registerRes.data.accessToken;
  const authHeaders = { Authorization: `Bearer ${token}` };

  let createdOrder = null;
  let mockPaymentId = `pay_mock_${Date.now()}`;

  // Test 1: Create Order successfully
  await runTest('1. POST /api/orders/create (Valid Pass & Quantity)', async () => {
    const res = await axios.post(
      `${BASE_URL}/orders/create`,
      {
        passId: testPass._id.toString(),
        quantity: 2
      },
      { headers: authHeaders }
    );

    if (!res.data.success) throw new Error('Response success flag is false');
    if (res.data.data.totalAmount !== 2998) throw new Error(`Expected totalAmount 2998, got ${res.data.data.totalAmount}`);
    if (!res.data.data.razorpayOrderId) throw new Error('Missing razorpayOrderId');

    createdOrder = res.data.data;
  });

  // Test 2: Create Order validation failure (Invalid Quantity)
  await runTest('2. POST /api/orders/create (Invalid Quantity <= 0)', async () => {
    try {
      await axios.post(
        `${BASE_URL}/orders/create`,
        { passId: testPass._id.toString(), quantity: 0 },
        { headers: authHeaders }
      );
      throw new Error('Should have failed validation');
    } catch (e) {
      if (e.response?.status !== 400) throw new Error(`Expected status 400, got ${e.response?.status}`);
    }
  });

  // Test 3: Verify Payment (Simulate frontend sending signature)
  await runTest('3. POST /api/payments/verify (Valid Signature & Order Finalization)', async () => {
    const razorpayOrderId = createdOrder.razorpayOrderId;
    const secret = env.RAZORPAY_KEY_SECRET;
    const bodyToSign = `${razorpayOrderId}|${mockPaymentId}`;
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(bodyToSign)
      .digest('hex');

    const res = await axios.post(
      `${BASE_URL}/payments/verify`,
      {
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: mockPaymentId,
        razorpay_signature: generatedSignature
      },
      { headers: authHeaders }
    );

    if (!res.data.success) throw new Error('Payment verification failed');
    if (res.data.data.status !== 'PAID') throw new Error(`Order status is not PAID: ${res.data.data.status}`);
    if (res.data.data.tickets.length !== 2) throw new Error(`Expected 2 tickets generated, got ${res.data.data.tickets.length}`);
  });

  // Test 4: Verify Idempotency (Subsequent verification call on already PAID order)
  await runTest('4. POST /api/payments/verify Idempotency (Already PAID)', async () => {
    const razorpayOrderId = createdOrder.razorpayOrderId;
    const secret = env.RAZORPAY_KEY_SECRET;
    const bodyToSign = `${razorpayOrderId}|${mockPaymentId}`;
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(bodyToSign)
      .digest('hex');

    const res = await axios.post(
      `${BASE_URL}/payments/verify`,
      {
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: mockPaymentId,
        razorpay_signature: generatedSignature
      },
      { headers: authHeaders }
    );

    if (!res.data.success) throw new Error('Idempotent verification failed');
    if (res.data.data.status !== 'PAID') throw new Error('Status not PAID');
  });

  // Test 5: Razorpay Webhook Processing
  await runTest('5. POST /api/payments/webhook (Razorpay Webhook Verification)', async () => {
    // Create a new order for webhook testing
    const orderRes = await axios.post(
      `${BASE_URL}/orders/create`,
      { passId: testPass._id.toString(), quantity: 1 },
      { headers: authHeaders }
    );
    const webhookOrder = orderRes.data.data;
    const webhookPaymentId = `pay_webhook_${Date.now()}`;

    const webhookPayload = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: webhookPaymentId,
            order_id: webhookOrder.razorpayOrderId,
            amount: webhookOrder.totalAmount * 100,
            status: 'captured'
          }
        }
      }
    });

    const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;
    const webhookSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(webhookPayload)
      .digest('hex');

    const res = await axios.post(
      `${BASE_URL}/payments/webhook`,
      webhookPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': webhookSignature
        }
      }
    );

    if (!res.data.received) throw new Error('Webhook missing received flag');

    // Confirm order was marked as PAID in database
    const dbOrder = await Order.findById(webhookOrder.id);
    if (dbOrder.paymentStatus !== 'paid') throw new Error(`Order paymentStatus after webhook is ${dbOrder.paymentStatus}, expected paid`);

    const tickets = await Ticket.find({ order: webhookOrder.id });
    if (tickets.length !== 1) throw new Error(`Expected 1 ticket created by webhook, found ${tickets.length}`);
  });

  console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runRazorpayIntegrationTest();
