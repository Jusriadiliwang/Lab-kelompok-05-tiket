/**
 * api-gateway — src/index.js
 * Entry point: Auth + Rate-limit + Routing ke semua microservice
 *
 * Routing table:
 *   GET  /catalog, /events/*              → event-service   :3001
 *   POST /events, PUT /events/*           → event-service   :3001  (admin)
 *   /orders/*, /tickets/*                 → ticket-service  :3002
 *   /payments/*                           → payment-service :3003
 *   /notifications/*                      → notification-service :3004
 *
 * Kelompok 5
 */
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const Redis   = require('ioredis');

const { correlationIdMiddleware } = require('./middleware/correlation-id.middleware');
const { authMiddleware, signToken } = require('./middleware/auth.middleware');
const { rateLimitMiddleware }     = require('./middleware/rate-limit.middleware');
const { catalogCacheHandler }     = require('./middleware/cache.middleware');
const eventProxy       = require('./proxy/event.proxy');
const ticketProxy      = require('./proxy/ticket.proxy');
const paymentProxy     = require('./proxy/payment.proxy');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Redis client (untuk user store di auth/register) ─────────
const redisClient = new Redis({
  host:     process.env.REDIS_HOST     || 'localhost',
  port:     parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || 'tiketkonser123',
  lazyConnect: true,
});
redisClient.on('error', (e) => console.error('[api-gateway][Redis]', e.message));
app.locals.redisClient = redisClient;

// ── Global Middleware ─────────────────────────────────────────
app.use(cors());
app.use(morgan('combined'));
app.use(correlationIdMiddleware);  // Inject X-Correlation-ID
app.use(authMiddleware);           // Verifikasi JWT
app.use(rateLimitMiddleware);      // Sliding-window rate limit

// ── Health check (sebelum proxy) ─────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date(),
    correlationId: req.correlationId,
    upstreams: {
      'event-service':        process.env.EVENT_SERVICE_URL        || 'http://localhost:3001',
      'ticket-service':       process.env.TICKET_SERVICE_URL       || 'http://localhost:3002',
      'payment-service':      process.env.PAYMENT_SERVICE_URL      || 'http://localhost:3003',
      'notification-service': process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004',
    },
  });
});

// ── Auth endpoints ───────────────────────────────────────────

// POST /auth/register — Daftarkan user baru dengan nama + userId
// Menyimpan user sederhana di Redis dengan TTL panjang (tidak butuh DB baru)
app.post('/auth/register', express.json(), async (req, res) => {
  try {
    const { userId, name, email } = req.body;

    if (!userId || typeof userId !== 'string' || userId.trim().length < 3) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'userId wajib diisi dan minimal 3 karakter',
      });
    }
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Nama wajib diisi dan minimal 2 karakter',
      });
    }

    const cleanUserId = userId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const cleanName   = name.trim();

    // Simpan profil user di Redis (TTL 365 hari)
    const redis = req.app.locals.redisClient;
    if (redis) {
      const existing = await redis.get(`user:${cleanUserId}`);
      if (existing) {
        return res.status(409).json({
          error: 'user_exists',
          message: `User ID '${cleanUserId}' sudah terdaftar. Gunakan User ID lain atau langsung login.`,
        });
      }
      await redis.setex(`user:${cleanUserId}`, 60 * 60 * 24 * 365, JSON.stringify({
        userId: cleanUserId,
        name: cleanName,
        email: email?.trim() || null,
        role: 'user',
        registeredAt: new Date().toISOString(),
      }));
    }

    const token = signToken({ userId: cleanUserId, name: cleanName, role: 'user' });
    return res.status(201).json({
      token,
      userId: cleanUserId,
      name:   cleanName,
      role:   'user',
      message: `Selamat datang, ${cleanName}! Akun berhasil dibuat.`,
    });
  } catch (err) {
    console.error('[POST /auth/register]', err.message);
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// POST /auth/login — Login dengan userId yang sudah terdaftar
app.post('/auth/login', express.json(), async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'validation_error', message: 'userId wajib diisi' });
    }

    const cleanUserId = userId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

    // Cek user di Redis
    const redis = req.app.locals.redisClient;
    let userData = null;
    if (redis) {
      const raw = await redis.get(`user:${cleanUserId}`);
      if (raw) userData = JSON.parse(raw);
    }

    // Fallback: kalau tidak ada di Redis (user lama / dev), tetap bisa login
    if (!userData) {
      userData = { userId: cleanUserId, name: cleanUserId, role: 'user' };
    }

    const token = signToken({ userId: userData.userId, name: userData.name, role: userData.role });
    return res.json({
      token,
      userId: userData.userId,
      name:   userData.name,
      role:   userData.role,
      message: `Selamat datang kembali, ${userData.name}!`,
    });
  } catch (err) {
    console.error('[POST /auth/login]', err.message);
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// POST /auth/token (dev only) — tetap ada untuk testing
if (process.env.NODE_ENV !== 'production') {
  app.post('/auth/token', express.json(), (req, res) => {
    const { userId = 'user_test', role = 'user' } = req.body;
    const token = signToken({ userId, role });
    res.json({ token, userId, role });
  });
}


// ── Routing → Proxy ──────────────────────────────────────────

// /catalog — Redis cache (TTL 5s) + direct fetch ke event-service
app.get('/catalog', catalogCacheHandler);

// event-service: events (proxy)
app.use('/events',   eventProxy);

// ticket-service: orders, tickets
app.use('/orders',   ticketProxy);
app.use('/tickets',  ticketProxy);

// payment-service: payments
app.use('/payments', paymentProxy);

// notification-service: notifications
const { createProxyMiddleware } = require('http-proxy-middleware');
app.use('/notifications', createProxyMiddleware({
  target: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004',
  changeOrigin: true,
  on: {
    error: (err, req, res) => {
      res.status(502).json({ error: 'bad_gateway', message: 'notification-service tidak dapat dihubungi' });
    },
  },
}));

// erp-service: back-office & analytics (M1–M6)
// Mobile app mengakses ERP analytics (M4) via gateway — tidak langsung ke :3005
app.use('/erp', createProxyMiddleware({
  target: process.env.ERP_SERVICE_URL || 'http://localhost:3005',
  changeOrigin: true,
  on: {
    error: (err, req, res) => {
      res.status(502).json({ error: 'bad_gateway', message: 'erp-service tidak dapat dihubungi' });
    },
  },
}));

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: 'not_found',
    message: `${req.method} ${req.path} tidak ditemukan`,
    correlationId: req.correlationId,
  });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[api-gateway] Berjalan di http://localhost:${PORT}`);
  console.log(`[api-gateway] Routing: /catalog|/events → :3001 | /orders|/tickets → :3002 | /payments → :3003 | /notifications → :3004 | /erp → :3005`);
  console.log(`[api-gateway] Rate limit aktif | JWT auth aktif`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[api-gateway] DEV: POST /auth/token untuk generate JWT`);
  }
});
