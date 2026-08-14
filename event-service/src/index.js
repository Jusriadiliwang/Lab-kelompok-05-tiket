/**
 * event-service — index.js
 * Entry point untuk event-service
 * Kelompok 5: Ashabul Kahfi (Backend/API Engineer)
 */
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');

const eventsRouter = require('./routes/events');
const db           = require('./db');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// ── Routes ────────────────────────────────────────────────────
app.use('/', eventsRouter);

// Health check
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', service: 'event-service', timestamp: new Date() });
  } catch {
    res.status(503).json({ status: 'error', service: 'event-service' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'not_found', message: `${req.method} ${req.path} tidak ditemukan` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[event-service] Unhandled error:', err);
  res.status(500).json({ error: 'internal_error', message: 'Terjadi kesalahan server' });
});

// ── Start ─────────────────────────────────────────────────────
async function start() {
  // Tunggu DB siap
  let retries = 10;
  while (retries > 0) {
    try {
      await db.query('SELECT 1');
      console.log('[event-service] Database terhubung');
      break;
    } catch (err) {
      retries--;
      console.log(`[event-service] Menunggu database... (${retries} percobaan tersisa)`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  app.listen(PORT, () => {
    console.log(`[event-service] Berjalan di http://localhost:${PORT}`);
    console.log(`[event-service] Endpoints: GET /catalog, GET /events, POST /events`);
  });
}

start().catch(console.error);
