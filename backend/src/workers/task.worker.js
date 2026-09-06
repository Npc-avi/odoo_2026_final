import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { getTransporter } from '../service/email.service.js';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let taskWorker = null;

/**
 * Initialize background BullMQ worker
 */
export function initTaskWorker() {
  if (taskWorker) return taskWorker;

  try {
    const workerConnection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    });

    workerConnection.on('error', (err) => {
      console.warn('[BullMQ Worker Connection Warning]:', err.message);
    });

    taskWorker = new Worker(
      'dealflow-tasks',
      async (job) => {
        console.log(`[Task Worker] Starting job '${job.name}' (ID: ${job.id})`);

        switch (job.name) {
          case 'email-notification': {
            const mailer = getTransporter();
            const info = await mailer.sendMail(job.data);
            console.log(`[Task Worker] Email dispatched via BullMQ to: ${job.data?.to} (MessageId: ${info?.messageId})`);
            return { success: true, messageId: info?.messageId, deliveredTo: job.data?.to };
          }

          case 'report-generation': {
            const { reportType, period } = job.data;
            console.log(`[Task Worker] Generating ${reportType} report for period: ${period}`);
            return { success: true, reportType, generatedAt: new Date().toISOString() };
          }

          case 'deal-telemetry-sync': {
            console.log('[Task Worker] Executing deal telemetry synchronization job');
            return { success: true, syncedAt: new Date().toISOString() };
          }

          default:
            console.log(`[Task Worker] Unknown task job name '${job.name}'`);
            return { status: 'unhandled' };
        }
      },
      {
        connection: workerConnection,
        concurrency: 5,
      }
    );

    taskWorker.on('completed', (job) => {
      console.log(`[Task Worker] Job '${job.name}' (ID: ${job.id}) completed successfully.`);
    });

    taskWorker.on('failed', (job, err) => {
      console.error(`[Task Worker] Job '${job?.name}' (ID: ${job?.id}) failed:`, err.message);
    });

    console.log('[Task Worker] BullMQ background worker listening for queue events.');
    return taskWorker;
  } catch (err) {
    console.warn('[Task Worker] Could not start worker (Redis offline?):', err.message);
    return null;
  }
}
