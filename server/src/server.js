const app = require('./app');
const env = require('./config/env');
const connectDB = require('./config/db');

const startServer = async () => {
  // Connect to MongoDB
  await connectDB();

  const PORT = env.PORT;

  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║                                              ║
║   🎪  Rangilo Raas 2.0 — API Server         ║
║                                              ║
║   Port:        ${String(PORT).padEnd(30)}║
║   Environment: ${env.NODE_ENV.padEnd(30)}║
║   Health:      http://localhost:${PORT}/api/health  ║
║                                              ║
╚══════════════════════════════════════════════╝
    `);
  });
};

startServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
