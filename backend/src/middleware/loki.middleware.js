/**
 * Enterprise Loki Logger Middleware for DealFlow360
 * Features:
 *  - Guaranteed monotonic timestamps (no duplicate or out-of-order drops)
 *  - Micro-batched flushing (instant, non-blocking delivery)
 *  - Dynamic level classification (info, warn, error)
 *  - Rich structured log lines with method, status, path, latency, and user context
 *  - Compatible with Grafana's default Explore queries and histogram charts
 */

const LOKI_PUSH_URL = process.env.LOKI_URL || 'http://localhost:3100/loki/api/v1/push';
const ENV = process.env.NODE_ENV || 'development';

// In-memory queue & monotonic timestamp state
let logQueue = [];
let lastTimestampNs = 0n;
let flushTimer = null;
let isFlushing = false;

/**
 * Returns a strictly increasing nanosecond timestamp as a string.
 * Guarantees that concurrent requests in the same millisecond never collide.
 */
function getMonotonicTimestampNs() {
  let current = BigInt(Date.now()) * 1000000n;
  if (current <= lastTimestampNs) {
    lastTimestampNs = lastTimestampNs + 1000n; // increment by 1 microsecond to guarantee ordering
    return lastTimestampNs.toString();
  }
  lastTimestampNs = current;
  return current.toString();
}

/**
 * Flushes all pending log lines to Grafana Loki in grouped streams
 */
async function flushLogs() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (logQueue.length === 0 || isFlushing) return;

  isFlushing = true;
  const batch = logQueue.splice(0, 100);

  try {
    // Group logs by stream labels (level, method, status group)
    const streamMap = new Map();

    for (const item of batch) {
      const key = `${item.level}-${item.method}`;
      if (!streamMap.has(key)) {
        streamMap.set(key, {
          stream: {
            job: 'backend-api',
            app: 'dealflow360',
            env: ENV,
            level: item.level,
            method: item.method,
            status: item.statusCode.toString(),
          },
          values: [],
        });
      }
      streamMap.get(key).values.push([item.timestampNs, item.message]);
    }

    const payload = {
      streams: Array.from(streamMap.values()),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(LOKI_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok && res.status !== 204) {
      const errText = await res.text().catch(() => '');
      console.warn(`[Loki] Ingestion responded with status ${res.status}: ${errText.slice(0, 150)}`);
    }
  } catch (err) {
    // Non-fatal: Loki may be restarting or unavailable
    if (err.name !== 'AbortError') {
      // Re-queue items if network glitch (up to 200 max)
      if (logQueue.length < 200) {
        logQueue.unshift(...batch);
      }
    }
  } finally {
    isFlushing = false;
    // If more logs accumulated while flushing, trigger next flush immediately
    if (logQueue.length > 0) {
      setTimeout(flushLogs, 50);
    }
  }
}

/**
 * Enqueues a log entry for delivery to Loki
 */
function enqueueLog(level, method, statusCode, message) {
  const timestampNs = getMonotonicTimestampNs();
  logQueue.push({
    level,
    method,
    statusCode,
    message,
    timestampNs,
  });

  // Flush immediately if queue has 10 or more items, otherwise within 100ms
  if (logQueue.length >= 10) {
    flushLogs();
  } else if (!flushTimer) {
    flushTimer = setTimeout(flushLogs, 100);
  }
}

/**
 * Public helper to log custom backend events directly to Loki
 */
export function logToLoki(level, message, metadata = {}) {
  const metaStr = Object.keys(metadata).length ? ` ${JSON.stringify(metadata)}` : '';
  enqueueLog(level, 'SYSTEM', 0, `[${level.toUpperCase()}] ${message}${metaStr}`);
}

/**
 * Express middleware that intercepts every API hit and streams it to Loki
 */
export const lokiLoggerMiddleware = (req, res, next) => {
  // Exclude high-frequency Prometheus scraper to avoid spamming logs
  if (req.originalUrl?.startsWith('/api/metrics') || req.url?.startsWith('/api/metrics')) {
    return next();
  }

  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1000000;
    const durationFormatted = durationMs.toFixed(2);

    const statusCode = res.statusCode;
    const method = req.method;
    const url = req.originalUrl || req.url;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '-';
    const userEmail = req.user?.email || 'anonymous';

    // Determine level: error (5xx), warn (4xx), info (2xx, 3xx)
    let level = 'info';
    if (statusCode >= 500) {
      level = 'error';
    } else if (statusCode >= 400) {
      level = 'warn';
    }

    // Clean, structured log line with JSON metadata suffix for easy Grafana parsing
    const logLine = `[HTTP] ${method} ${url} ${statusCode} ${durationFormatted}ms - IP: ${ip} | User: ${userEmail} | {"method":"${method}","url":"${url}","status":${statusCode},"duration_ms":${durationFormatted},"user":"${userEmail}"}`;

    enqueueLog(level, method, statusCode, logLine);
  });

  next();
};
