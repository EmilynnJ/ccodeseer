import { createApp } from './app.js';
import { config, validateEnv } from './config/index.js';
import { pool } from './db/index.js';
import { schedulePayouts } from './jobs/payouts.js';

async function main() {
  // Validate environment variables
  validateEnv();

  // Test database connection
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    client.release();
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }

  // Create and start Express app
  const app = createApp();

  const server = app.listen(config.port, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🔮 SoulSeer API Server                                 ║
║                                                           ║
║   Environment: ${config.env.padEnd(40)}║
║   Port: ${config.port.toString().padEnd(47)}║
║   Frontend URL: ${config.frontendUrl.padEnd(38)}║
║                                                           ║
║   Ready to accept connections...                          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
  });

  // Start scheduled jobs
  if (config.env === 'production') {
    const payoutTimer = schedulePayouts();
    console.log('📅 Automatic payout scheduler started');
  }

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(async () => {
      console.log('HTTP server closed');

      // Close database connection
      try {
        await pool.end();
        console.log('Database connection closed');
      } catch (error) {
        console.error('Error closing database:', error);
      }

      console.log('Graceful shutdown complete');
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
