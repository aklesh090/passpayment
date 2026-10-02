/**
 * Database Seeder — Initializes pass types for Rangilo Raas 2.0
 *
 * Usage: node src/seeds/seedPasses.js
 *
 * This seeds the MongoDB database with the 11 pass products.
 * Safe to run multiple times — uses upsert on slug.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
const PassType = require('../models/PassType');

const PASSES = [
  {
    name: 'VIP Season Pass',
    slug: 'vip-season-pass',
    category: 'season',
    applicableDays: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    price: 750,
    totalQuantity: 500,
    perks: ['Front Row Access', 'Complimentary Dinner', 'VIP Lounge'],
  },
  {
    name: 'GA Season Pass',
    slug: 'ga-season-pass',
    category: 'season',
    applicableDays: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    price: 550,
    totalQuantity: 1000,
    perks: ['General Admission All 9 Days'],
  },
  ...Array.from({ length: 9 }, (_, i) => ({
    name: `Day ${i + 1} Pass`,
    slug: `day-${i + 1}-pass`,
    category: 'daily',
    applicableDays: [i + 1],
    price: 100,
    totalQuantity: 200,
    perks: [`Entry for Day ${i + 1}`],
  })),
];

async function seed() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not set in .env');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    for (const pass of PASSES) {
      await PassType.findOneAndUpdate(
        { slug: pass.slug },
        { $setOnInsert: pass },
        { upsert: true, new: true }
      );
      console.log(`  ✓ ${pass.name} — ₹${pass.price}`);
    }

    console.log(`\n✅ Seeded ${PASSES.length} pass types successfully`);

    // Admin Seeding
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPassword) {
      const User = require('../models/User');
      const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase() });
      if (!existingAdmin) {
        await User.create({
          name: 'Admin User',
          email: adminEmail,
          phone: '9999999999',
          passwordHash: adminPassword,
          role: 'admin'
        });
        console.log(`✅ Admin user seeded: ${adminEmail}`);
      } else {
        console.log(`ℹ️ Admin user already exists: ${adminEmail}`);
      }
    } else {
      console.log(`ℹ️ ADMIN_EMAIL or ADMIN_PASSWORD not set. Skipping admin seed.`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  }
}

seed();
