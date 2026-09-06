import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const queueConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
});

queueConnection.on('error', (err) => {
  console.warn('[BullMQ Redis Connection Warning]:', err.message);
});

// Dedicated task queue for background jobs (emails, report generation, telemetry)
export const taskQueue = new Queue('dealflow-tasks', {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

/**
 * Dispatch an asynchronous email notification job to the BullMQ queue
 */
export async function queueEmailNotification(emailData) {
  try {
    return await taskQueue.add('email-notification', emailData, {
      priority: 1,
    });
  } catch (err) {
    console.warn('[TaskQueue Warning] Could not enqueue email notification:', err.message);
    return null;
  }
}

/**
 * Dispatch an asynchronous report generation job to the BullMQ queue
 */
export async function queueReportGeneration(reportParams) {
  try {
    return await taskQueue.add('report-generation', reportParams, {
      priority: 2,
    });
  } catch (err) {
    console.warn('[TaskQueue Warning] Could not enqueue report generation:', err.message);
  }
}
