require('dotenv').config();
const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../models/User');

async function createOrPromoteAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.log('Usage: node src/seeds/createAdmin.js <email> [optional_password] [optional_name]');
    console.log('Example: node src/seeds/createAdmin.js admin@rangiloraas.com Admin123! "Super Admin"');
    process.exit(1);
  }

  const password = process.argv[3] || 'Admin@123456';
  const name = process.argv[4] || 'Admin User';
  const phone = '9999999999';

  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    let user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      user.role = 'admin';
      if (process.argv[3]) {
        user.passwordHash = password; // pre('save') hook will hash it
      }
      await user.save();
      console.log(`✅ Success: User with email "${email}" has been updated with role: "admin" and the provided password.`);
    } else {
      user = await User.create({
        name,
        email: email.toLowerCase(),
        phone,
        passwordHash: password, // pre('save') hook will hash it
        role: 'admin',
      });
      console.log(`✅ Success: Created new admin user!`);
      console.log(`   Email:    ${email}`);
      console.log(`   Password: ${password}`);
      console.log(`   Role:     admin`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating/promoting admin:', err.message);
    process.exit(1);
  }
}

createOrPromoteAdmin();
