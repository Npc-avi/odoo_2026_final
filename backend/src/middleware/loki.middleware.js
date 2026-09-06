import morgan from 'morgan';

const LOKI_PUSH_URL = process.env.LOKI_URL || 'http://localhost:3100/loki/api/v1/push';

/**
 * Asynchronously pushes a log line to Grafana Loki in non-blocking fashion
 */
async function pushToLoki(logLine) {
  try {
    // Loki expects timestamps in nanoseconds as strings
    const timestampNs = (BigInt(Date.now()) * 1000000n).toString();

    const payload = {
      streams: [
        {
          stream: {
            job: 'backend-api',
            app: 'dealflow360',
            env: process.env.NODE_ENV || 'development',
          },
          values: [[timestampNs, logLine.trim()]],
        },
      ],
    };

    // Use native fetch with a short abort timeout so it never stalls Express
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    await fetch(LOKI_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).catch(() => {
      // Silently ignore connection drops when Loki is idle/restarting
    });

    clearTimeout(timeoutId);
  } catch {
    // Non-blocking catch
  }
}

/**
 * Custom stream for Morgan that forwards uncolored text logs to Loki
 */
const lokiStream = {
  write: (message) => {
    // Strip ANSI color codes if any exist before sending to Loki
    const cleanMessage = message.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
    pushToLoki(cleanMessage);
  },
};

/**
 * Morgan logger middleware configured for Grafana Loki log ingestion
 * Features:
 *  - Smart skip filter: excludes /api/metrics so high-frequency scrapes don't pollute logs
 *  - Combined format for detailed structured HTTP telemetry
 */
export const lokiLoggerMiddleware = morgan('combined', {
  stream: lokiStream,
  skip: (req) => {
    return req.url.startsWith('/api/metrics');
  },
});
