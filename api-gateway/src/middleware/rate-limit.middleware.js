/**
 * api-gateway — middleware/rate-limit.middleware.js
 * Sliding window rate limiter menggunakan Redis
 *
 * Aturan (sesuai ADR-005):
 *   POST /orders  → 10 request per 10 detik per user (anti war-tiket bot)
 *   POST /payments → 5 request per 30 detik per user
 *   Default       → 100 request per 60 detik per user
 */

let redis;
function getRedis() {
  if (!redis) {
    const Redis = require('ioredis');
    redis = new Redis({
      host:        process.env.REDIS_HOST     || 'localhost',
      port:        parseInt(process.env.REDIS_PORT) || 6379,
      password:    process.env.REDIS_PASSWORD || 'tiketkonser123',
      lazyConnect:  true,
    });
    redis.on('error', (e) => {
      // Jika Redis down, jangan block request — degrade gracefully
      console.error('[api-gateway][Redis rate-limit]', e.message);
    });
  }
  return redis;
}

// Definisi limit per route
const RATE_RULES = [
  { method: 'POST', pattern: /^\/orders$/,   limit: 10, windowSec: 10  },
  { method: 'POST', pattern: /^\/payments$/, limit: 5,  windowSec: 30  },
];
const DEFAULT_LIMIT     = 100;
const DEFAULT_WINDOW    = 60;

function getRule(method, path) {
  return RATE_RULES.find(r => r.method === method && r.pattern.test(path)) || null;
}

async function rateLimitMiddleware(req, res, next) {
  // Ambil identifier: user (jika sudah auth) atau IP
  const identifier = req.headers['x-user-id'] || req.ip || 'anonymous';
  const rule = getRule(req.method, req.path);
  const limit     = rule ? rule.limit     : DEFAULT_LIMIT;
  const windowSec = rule ? rule.windowSec : DEFAULT_WINDOW;

  const key = `ratelimit:${req.method}:${req.path}:${identifier}`;

  try {
    const r = getRedis();
    const now = Date.now();
    const windowMs = windowSec * 1000;

    // Sliding window: hapus entri di luar window, tambah timestamp sekarang, hitung
    const pipe = r.pipeline();
    pipe.zremrangebyscore(key, 0, now - windowMs);
    pipe.zadd(key, now, `${now}-${Math.random()}`);
    pipe.zcard(key);
    pipe.expire(key, windowSec + 1);
    const results = await pipe.exec();

    const count = results[2][1]; // zcard result

    res.setHeader('X-RateLimit-Limit',     limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - count));
    res.setHeader('X-RateLimit-Window',    `${windowSec}s`);

    if (count > limit) {
      return res.status(429).json({
        error: 'too_many_requests',
        message: `Rate limit terlampaui. Maksimal ${limit} request per ${windowSec} detik.`,
        retryAfter: windowSec,
        correlationId: req.correlationId,
      });
    }
  } catch (err) {
    // Redis error → degrade gracefully, jangan blokir request
    console.error('[api-gateway] Rate limit error (degraded):', err.message);
  }

  next();
}

module.exports = { rateLimitMiddleware };
