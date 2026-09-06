import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import session from 'express-session';
import { RedisStore } from 'connect-redis';

import { redisClient } from './config/redis.js';
import { pool } from './config/database.js';
import { authRateLimiter } from './middleware/rate-limit.middleware.js';
import { metricsMiddleware, getMetricsHandler } from './middleware/metrics.middleware.js';
import { lokiLoggerMiddleware } from './middleware/loki.middleware.js';

import authRoutes from './routes/auth.route.js';
import portalAuthRoutes from './routes/portal-auth.route.js';
import catalogRoutes from './routes/catalog.route.js';
import rfqRoutes from './routes/rfq.route.js';
import quotationRoutes from './routes/quotation.route.js';
import approvalRoutes from './routes/approval.route.js';
import negotiationRoutes from './routes/negotiation.route.js';
import fulfillmentRoutes from './routes/fulfillment.route.js';
import subscriptionRoutes from './routes/subscription.route.js';
import billingRoutes from './routes/billing.route.js';
import dealhealthRoutes from './routes/dealhealth.route.js';
import notificationRoutes from './routes/notification.route.js';
import reportingRoutes from './routes/reporting.route.js';
import governanceRoutes from './routes/governance.route.js';

import { verifyStaffToken } from './middleware/auth.middleware.js';
import { withTenantContext } from './middleware/tenant-context.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';

const app = express();

// Trust reverse proxy (Nginx) for accurate client IP identification in rate-limiting
app.set('trust proxy', 1);

// ----------------------------------------------------------------------------
// 1. Telemetry & Observability Middlewares (Prometheus & Loki)
// ----------------------------------------------------------------------------

// Record Prometheus HTTP request duration and request counters
app.use(metricsMiddleware);

// Standard colored Morgan console logger (Terminal dev view)
app.use(
  morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
    skip: (req) => req.url.startsWith('/api/metrics'),
  })
);

// Asynchronous log forwarder to Grafana Loki (3100/loki/api/v1/push)
app.use(lokiLoggerMiddleware);

// ----------------------------------------------------------------------------
// 2. CORS Configuration with Explicit Allow-List (Internal Workspace vs Customer Portal)
// ----------------------------------------------------------------------------
const defaultOrigins = [
  'http://localhost',
  'http://localhost:80',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://127.0.0.1',
  'http://127.0.0.1:80',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5173',
];

const envOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((s) => s.trim())
  : [];

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(new Error(`Origin '${origin}' not permitted by CORS policy.`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// ----------------------------------------------------------------------------
// 3. Body Parsing & Cookies
// ----------------------------------------------------------------------------
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());

// ----------------------------------------------------------------------------
// 4. Redis-Backed Session Layer (30-day Rolling TTL - Persistent & Seamless)
// ----------------------------------------------------------------------------
const redisSessionStore = new RedisStore({
  client: redisClient,
  prefix: 'sess:',
  ttl: 30 * 24 * 60 * 60, // 30 days TTL in seconds
});

app.use(
  session({
    store: redisSessionStore,
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'dealflow360_enterprise_session_secret_2026',
    resave: false,
    saveUninitialized: false,
    rolling: true, // Automatically extends session cookie expiration on user activity
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
      sameSite: 'lax',
    },
  })
);

// ----------------------------------------------------------------------------
// 5. Infrastructure Endpoints: Prometheus Scrape & Health Checks
// ----------------------------------------------------------------------------

// Prometheus Metrics Scrape Endpoint (GET /api/metrics)
app.get('/api/metrics', getMetricsHandler);

// Enterprise System Health Check Endpoint (GET /api/health)
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    const dbTest = await pool.query('SELECT 1 AS alive');
    if (dbTest && dbTest.rows?.[0]?.alive === 1) {
      dbStatus = 'connected';
    }
  } catch (err) {
    dbStatus = `unreachable (${err.message})`;
  }

  const redisStatus = redisClient.isReady
    ? 'connected'
    : redisClient.isOpen
    ? 'connecting'
    : 'disconnected';

  const isHealthy = dbStatus === 'connected';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    service: 'DealFlow360 Enterprise API',
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus,
      redis: redisStatus,
      prometheus: 'ready',
      loki: 'streaming',
    },
  });
});

// Section 8.2 Requirement: Staff whoami endpoint to verify GUC & Role plumbing round-trip
app.get('/api/whoami', verifyStaffToken, async (req, res, next) => {
  try {
    const diagnostic = await withTenantContext(req.actor, async (client) => {
      const gucRes = await client.query(`
        SELECT
          current_setting('app.current_tenant_id', true) AS tenant_id,
          current_setting('app.current_actor_type', true) AS actor_type,
          current_setting('app.current_user_id', true) AS user_id,
          current_setting('app.current_role', true) AS app_role,
          current_user,
          session_user
      `);
      return gucRes.rows[0];
    });

    res.status(200).json({
      actor: req.actor,
      databaseGucState: diagnostic,
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// 6. Redis Rate-Limiting Protection ONLY on Login and Register routes
// ----------------------------------------------------------------------------
app.use('/api/auth/login', authRateLimiter);
app.use('/api/auth/register', authRateLimiter);
app.use('/api/auth/register-company', authRateLimiter);
app.use('/api/portal/auth/login', authRateLimiter);

// ----------------------------------------------------------------------------
// 7. API Feature Routes
// ----------------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/portal/auth', portalAuthRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/rfq', rfqRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/negotiations', negotiationRoutes);
app.use('/api/fulfillment', fulfillmentRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/dealhealth', dealhealthRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reporting', reportingRoutes);
app.use('/api/governance', governanceRoutes);

// 404 Catch-All Handler
app.use((req, res, next) => {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.status = 404;
  next(err);
});

// ----------------------------------------------------------------------------
// 8. Central Error Handler Middleware (Must be last app.use())
// ----------------------------------------------------------------------------
app.use(errorHandler);

export default app;
