import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient } from '../config/redis.js';

/**
 * Enterprise rate-limiter backed by Redis store
 * Strictly protects authentication endpoints against brute-force attacks
 * Configured only on login and registration POST requests
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 50, // Max 50 authentication attempts per 15-minute window per IP
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true, // Never block legitimate users if Redis has temporary connection hiccups
  skip: (req) => req.method !== 'POST', // Strictly rate limit POST login/register attempts only
  message: {
    error: 'Too Many Requests',
    message: 'Too many authentication attempts from this IP address. Please wait 15 minutes before retrying.',
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args.flat()),
    prefix: 'rl:auth:',
  }),
});
