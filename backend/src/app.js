import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

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

// ----------------------------------------------------------------------------
// CORS Configuration with Explicit Allow-List (Internal Workspace vs Customer Portal)
// ----------------------------------------------------------------------------
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001'
];

const envOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(s => s.trim())
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
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Standard Middlewares
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ----------------------------------------------------------------------------
// Health Check & Diagnostics
// ----------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'DealFlow360 API',
    timestamp: new Date().toISOString()
  });
});

// Section 8.2 Requirement: Trivial staff whoami endpoint to verify GUC & Role plumbing round-trip
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
      databaseGucState: diagnostic
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// API Feature Routes
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

// 404 Catch-All
app.use((req, res, next) => {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.status = 404;
  next(err);
});

// ----------------------------------------------------------------------------
// Central Error Handler Middleware (Must be last app.use())
// ----------------------------------------------------------------------------
app.use(errorHandler);

export default app;
