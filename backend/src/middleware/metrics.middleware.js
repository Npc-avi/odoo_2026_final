import client from 'prom-client';

// Initialize default Prometheus system telemetry (CPU, Memory, Event Loop, GC)
client.collectDefaultMetrics({
  prefix: 'dealflow360_',
  timeout: 5000,
});

// Custom HTTP Request Duration Histogram
export const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

// Custom HTTP Request Total Counter
export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total count of HTTP requests handled',
  labelNames: ['method', 'route', 'status_code'],
});

// Redis Cache Telemetry
export const cacheOperationsTotal = new client.Counter({
  name: 'cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['operation', 'result'],
});

/**
 * Express middleware to record Prometheus metrics for incoming HTTP requests
 */
export function metricsMiddleware(req, res, next) {
  // Do not record metrics for the metrics endpoint itself
  if (req.path === '/api/metrics') {
    return next();
  }

  const start = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationInSeconds = diff[0] + diff[1] / 1e9;

    // Normalize route to avoid high cardinality
    const route = req.route?.path || req.baseUrl || req.path || 'unknown';
    const statusCode = res.statusCode ? res.statusCode.toString() : '500';

    httpRequestDurationMicroseconds.observe(
      {
        method: req.method,
        route,
        status_code: statusCode,
      },
      durationInSeconds
    );

    httpRequestsTotal.inc({
      method: req.method,
      route,
      status_code: statusCode,
    });
  });

  next();
}

/**
 * Handler for GET /api/metrics returning plain-text Prometheus scrape output
 */
export async function getMetricsHandler(req, res) {
  try {
    res.set('Content-Type', client.register.contentType);
    const metrics = await client.register.metrics();
    res.end(metrics);
  } catch (err) {
    res.status(500).end(err.message);
  }
}
