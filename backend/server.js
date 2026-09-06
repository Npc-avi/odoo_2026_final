import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './src/app.js';
import { verifyDatabaseInitialization } from './src/config/init.js';
import { connectRedis } from './src/config/redis.js';
import { initTaskWorker } from './src/workers/task.worker.js';
import { startStalledDealCronJob } from './src/jobs/stalled-deal.job.js';
import { initGovernanceReportCronJobs } from './src/jobs/governance-report.job.js';
import { initSocket } from './src/service/socket.service.js';

const PORT = process.env.PORT || 4000;

async function startServer() {
  console.log('====================================================');
  console.log('       DEALFLOW 360 - SALES OPERATIONS API          ');
  console.log('====================================================');

  // 1. Verify database connectivity and non-owner application role membership
  await verifyDatabaseInitialization();

  // 2. Initialize Redis connection
  await connectRedis();

  // 3. Initialize BullMQ background task worker
  initTaskWorker();

  // 4. Initialize recurring scheduled jobs (hourly stalled-deal monitor & admin report cron)
  startStalledDealCronJob();
  await initGovernanceReportCronJobs();

  // 5. Create HTTP server and attach Socket.IO real-time telemetry
  const server = http.createServer(app);
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`[DealFlow360] Server listening on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
    console.log(`[DealFlow360] WebSocket Socket.IO initialized.`);
    console.log(`[DealFlow360] API Healthcheck available at: http://localhost:${PORT}/api/health`);
    console.log(`[DealFlow360] Prometheus Metrics available at: http://localhost:${PORT}/api/metrics`);
  });

  // Graceful shutdown handling
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
