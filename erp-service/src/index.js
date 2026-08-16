/**
 * erp-service — src/index.js
 * ERP Back-Office: M1 Event, M2 Seat, M3 Revenue, M4 Analytics, M5 Auth/RBAC, M6 Audit
 * Port: 3005
 * Kelompok 5
 */
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');

const db = require('./database');
const mq = require('./rabbitmq');
const { handleMessage } = require('./consumers');
const { start: startSyncJob }    = require('./jobs/sync-erp-snapshot.job');
const { start: startRevenueJob } = require('./jobs/generate-revenue-report.job');

// Controllers
const authController      = require('./modules/auth/auth.controller');
const eventController     = require('./modules/event/event.controller');
const seatController      = require('./modules/seat/seat.controller');
const revenueController   = require('./modules/revenue/revenue.controller');
const analyticsController = require('./modules/analytics/analytics.controller');
const auditController     = require('./modules/audit/audit.controller');

const app  = express();
const PORT = process.env.PORT || 3005;

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// ── Routes ───────────────────────────────────────────────────
app.use('/', authController);       // M5: /erp/auth/*, /erp/admin/users
app.use('/', eventController);      // M1: /erp/events/*
app.use('/', seatController);       // M2: /erp/events/:id/seats/*
app.use('/', revenueController);    // M3: /erp/revenue/*, /erp/payments/:id/refund
app.use('/', analyticsController);  // M4: /erp/analytics/*
app.use('/', auditController);      // M6: /erp/audit/*

// Health check
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', service: 'erp-service', timestamp: new Date() });
  } catch {
    res.status(503).json({ status: 'error', service: 'erp-service' });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'not_found', message: `${req.method} ${req.path} tidak ditemukan` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[erp-service] Unhandled error:', err);
  res.status(500).json({ error: 'internal_error', message: 'Terjadi kesalahan server' });
});

// ── Start ─────────────────────────────────────────────────────
async function start() {
  let retries = 10;
  while (retries > 0) {
    try {
      await db.query('SELECT 1');
      console.log('[erp-service] Database terhubung');
      break;
    } catch {
      retries--;
      console.log(`[erp-service] Menunggu database... (${retries} tersisa)`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  await mq.connect(handleMessage);
  startSyncJob();
  startRevenueJob();

  app.listen(PORT, () => {
    console.log(`[erp-service] Berjalan di http://localhost:${PORT}`);
    console.log('[erp-service] Modul: M1 Event | M2 Seat | M3 Revenue | M4 Analytics | M5 RBAC | M6 Audit');
  });
}

start().catch(console.error);
