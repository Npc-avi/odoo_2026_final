import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './src/app.js';
import { verifyDatabaseInitialization } from './src/config/init.js';
import { startStalledDealCronJob } from './src/jobs/stalled-deal.job.js';
import { initSocket } from './src/service/socket.service.js';

const PORT = process.env.PORT || 5000;

async function startServer() {
  console.log('====================================================');
  console.log('       DEALFLOW 360 - SALES OPERATIONS API          ');
  console.log('====================================================');

  // Verify database connectivity and non-owner application role membership
  await verifyDatabaseInitialization();

  // Initialize recurring scheduled jobs (hourly stalled-deal monitor)
  startStalledDealCronJob();

  const server = http.createServer(app);
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`[DealFlow360] Server listening on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
    console.log(`[DealFlow360] WebSocket Socket.IO initialized.`);
    console.log(`[DealFlow360] API Healthcheck available at: http://localhost:${PORT}/api/health`);
  });

  // Graceful shutdown
  const gracefulShutdown = (signal) => {
    console.log(`[DealFlow360] Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('[DealFlow360] HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

startServer().catch((err) => {
  console.error('[DealFlow360 Fatal Startup Error]:', err);
  process.exit(1);
});
