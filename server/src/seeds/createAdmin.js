const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../models/User');

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL || process.argv[2];
  const password = process.env.ADMIN_PASSWORD || process.argv[3];
  const name = process.env.ADMIN_NAME || process.argv[4] || 'System Admin';
  const phone = process.env.ADMIN_PHONE || '9999999999';

  if (!email || !password) {
    console.error('❌ Usage: ADMIN_EMAIL=<email> ADMIN_PASSWORD=<password> node src/seeds/createAdmin.js');
    console.error('   Or: node src/seeds/createAdmin.js <email> <password> [name]');
    process.exit(1);
  }

  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      if (existingUser.role === 'admin') {
        console.log(`ℹ️ Admin user already exists with email: ${normalizedEmail}`);
        await mongoose.disconnect();
        process.exit(0);
      } else {
        console.error(`⚠️ Error: Email '${normalizedEmail}' already belongs to a normal user (role: 'user'). Overwrite blocked.`);
        await mongoose.disconnect();
        process.exit(1);
      }
    }

    const newAdmin = await User.create({
      name,
      email: normalizedEmail,
      phone,
      passwordHash: password, // User model pre('save') hook automatically hashes with bcrypt
      role: 'admin',
    });

    console.log(`✅ Admin user created successfully!`);
    console.log(`   Email: ${newAdmin.email}`);
    console.log(`   Role:  ${newAdmin.role}`);
    console.log(`   ID:    ${newAdmin._id}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating admin user:', err.message);
    process.exit(1);
  }
}

createAdmin();
