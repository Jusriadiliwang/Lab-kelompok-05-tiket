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

const { correlationIdMiddleware } = require('./middleware/correlation-id.middleware');
const { authMiddleware, signToken } = require('./middleware/auth.middleware');
const { rateLimitMiddleware }     = require('./middleware/rate-limit.middleware');
const eventProxy       = require('./proxy/event.proxy');
const ticketProxy      = require('./proxy/ticket.proxy');
const paymentProxy     = require('./proxy/payment.proxy');

const app  = express();
const PORT = process.env.PORT || 3000;

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

// ── Dev-only: buat JWT token untuk testing ───────────────────
if (process.env.NODE_ENV !== 'production') {
  app.post('/auth/token', express.json(), (req, res) => {
    const { userId = 'user_test', role = 'user' } = req.body;
    const token = signToken({ userId, role });
    res.json({ token, userId, role });
  });
}

// ── Routing → Proxy ──────────────────────────────────────────

// event-service: catalog, events
app.use('/catalog',  eventProxy);
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
  console.log(`[api-gateway] Routing: /catalog|/events → :3001 | /orders|/tickets → :3002 | /payments → :3003 | /notifications → :3004`);
  console.log(`[api-gateway] Rate limit aktif | JWT auth aktif`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[api-gateway] DEV: POST /auth/token untuk generate JWT`);
  }
});
