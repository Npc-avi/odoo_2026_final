import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      // Exponential backoff capped at 3 seconds
      return Math.min(retries * 200, 3000);
    },
  },
});

redisClient.on('error', (err) => {
  // Gracefully log Redis connection errors without crashing the node process
  console.warn('[Redis Client Error]:', err.message);
});

redisClient.on('connect', () => {
  console.log(`[Redis] Connecting to Redis server at ${redisUrl}...`);
});

redisClient.on('ready', () => {
  console.log('[Redis] Ready: Client connection active and commands enabled.');
});

redisClient.on('reconnecting', () => {
  console.log('[Redis] Attempting reconnect...');
});

export async function connectRedis() {
  if (!redisClient.isOpen) {
    try {
      await redisClient.connect();
    } catch (err) {
      console.warn('[Redis Startup Warning]: Could not connect to Redis server. Running with cache fallback.', err.message);
    }
  }
}

// Auto-connect on import so that RedisStore & rate-limit-redis scripts initialize without race conditions
await connectRedis();

/**
 * Cache-Aside Pattern: Retrieve parsed JSON from Redis
 * @param {string} key
 * @returns {Promise<any|null>}
 */
export async function getCached(key) {
  try {
    if (!redisClient.isReady) return null;
    const raw = await redisClient.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn(`[Redis GET Error for ${key}]:`, err.message);
    return null;
  }
}

/**
 * Cache-Aside Pattern: Store JSON in Redis with expiration TTL (default: 3600 seconds = 1 hour)
 * @param {string} key
 * @param {any} data
 * @param {number} ttlSeconds
 */
export async function setCached(key, data, ttlSeconds = 3600) {
  try {
    if (!redisClient.isReady) return;
    await redisClient.set(key, JSON.stringify(data), {
      EX: ttlSeconds,
    });
  } catch (err) {
    console.warn(`[Redis SET Error for ${key}]:`, err.message);
  }
}

/**
 * Cache-Aside Pattern: Invalidate a key or pattern
 * @param {string} key
 */
export async function delCached(key) {
  try {
    if (!redisClient.isReady) return;
    await redisClient.del(key);
  } catch (err) {
    console.warn(`[Redis DEL Error for ${key}]:`, err.message);
  }
}

/**
 * Invalidate multiple keys by pattern (e.g. 'catalog:*')
 * @param {string} pattern
 */
export async function delCachedPattern(pattern) {
  try {
    if (!redisClient.isReady) return;
    const keys = await redisClient.keys(pattern);
    if (keys && keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (err) {
    console.warn(`[Redis DEL Pattern Error for ${pattern}]:`, err.message);
  }
}
