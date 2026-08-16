/**
 * api-gateway — middleware/cache.middleware.js
 * Redis response cache untuk GET /catalog
 * TTL: 5 detik — cukup untuk lindungi DB saat lonjakan,
 * tapi tidak stale terlalu lama agar kursi tersedia akurat.
 *
 * Catatan: http-proxy-middleware tidak memanggil res.send(),
 * sehingga cache diimplementasikan sebagai dedicated route handler,
 * bukan sebagai middleware intercept.
 */
const fetch = require('node-fetch');

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
    redis.on('error', (e) => console.error('[api-gateway][cache]', e.message));
  }
  return redis;
}

const CACHE_TTL_SEC    = parseInt(process.env.CATALOG_CACHE_TTL) || 5;
const EVENT_SERVICE_URL = process.env.EVENT_SERVICE_URL || 'http://localhost:3001';

// Route handler khusus untuk GET /catalog — cache-aware
async function catalogCacheHandler(req, res) {
  const page  = req.query.page  || '1';
  const limit = req.query.limit || '20';
  const cacheKey = `cache:catalog:${page}:${limit}`;

  try {
    // 1. Cek cache Redis
    const cached = await getRedis().get(cacheKey);
    if (cached) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Correlation-ID', req.correlationId);
      return res.send(cached);
    }
  } catch { /* Redis error → degrade gracefully */ }

  // 2. Cache MISS — fetch dari event-service
  try {
    const upstream = await fetch(
      `${EVENT_SERVICE_URL}/catalog?page=${page}&limit=${limit}`,
      { headers: { 'X-Correlation-ID': req.correlationId } }
    );
    const body = await upstream.text();

    // Simpan ke cache jika sukses
    if (upstream.ok) {
      getRedis().set(cacheKey, body, 'EX', CACHE_TTL_SEC).catch(() => {});
    }

    res.status(upstream.status);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('X-Correlation-ID', req.correlationId);
    res.send(body);
  } catch (err) {
    res.status(502).json({
      error: 'bad_gateway',
      message: 'event-service tidak dapat dihubungi',
      correlationId: req.correlationId,
    });
  }
}

module.exports = { catalogCacheHandler };
