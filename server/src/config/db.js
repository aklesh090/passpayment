const mongoose = require('mongoose');
const env = require('./env');

const connectDB = async () => {
  try {
    if (!env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    const conn = await mongoose.connect(env.MONGODB_URI);

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed (app termination)');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    // In production, exit. In development, allow the server to start anyway.
    if (env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

module.exports = connectDB;
