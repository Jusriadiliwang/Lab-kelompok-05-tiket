/**
 * ticket-service — index.js
 * Entry point + background job untuk expired orders
 * Kelompok 5: Ashabul Kahfi (Backend/API Engineer)
 */
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');

const ticketsRouter = require('./modules/reservation/reservation.controller');
const db            = require('./database');
const mq            = require('./rabbitmq');
const { start: startExpireJob } = require('./jobs/expire-reservation.job');
const { handleMessage } = require('./consumers');

const app  = express();
const PORT = process.env.PORT || 3002;

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// ── Routes ────────────────────────────────────────────────────
app.use('/', ticketsRouter);

app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', service: 'ticket-service', timestamp: new Date() });
  } catch {
    res.status(503).json({ status: 'error', service: 'ticket-service' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'not_found', message: `${req.method} ${req.path} tidak ditemukan` });
});

app.use((err, req, res, next) => {
  console.error('[ticket-service] Error:', err);
  res.status(500).json({ error: 'internal_error', message: 'Terjadi kesalahan server' });
});

// ── Start ─────────────────────────────────────────────────────
async function start() {
  let retries = 10;
  while (retries > 0) {
    try {
      await db.query('SELECT 1');
      console.log('[ticket-service] Database terhubung');
      break;
    } catch {
      retries--;
      console.log(`[ticket-service] Menunggu database... (${retries} tersisa)`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  await mq.connect(handleMessage);

  startExpireJob();

  app.listen(PORT, () => {
    console.log(`[ticket-service] Berjalan di http://localhost:${PORT}`);
    console.log(`[ticket-service] Endpoints kritis: POST /orders, GET /orders/:id, POST /orders/:id/cancel`);
  });
}

start().catch(console.error);
