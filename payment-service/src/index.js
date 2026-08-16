/**
 * payment-service — index.js
 * Kelompok 5: Ashabul Kahfi (Backend/API Engineer)
 */
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');

const paymentsRouter = require('./modules/order/order.controller');
const db             = require('./database');
const mq             = require('./rabbitmq');
const { start: startExpireJob } = require('./jobs/expire-order.job');

const app  = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

app.use('/', paymentsRouter);

app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', service: 'payment-service', timestamp: new Date() });
  } catch {
    res.status(503).json({ status: 'error', service: 'payment-service' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'not_found', message: `${req.method} ${req.path} tidak ditemukan` });
});

app.use((err, req, res, next) => {
  console.error('[payment-service] Error:', err);
  res.status(500).json({ error: 'internal_error', message: 'Terjadi kesalahan server' });
});

async function start() {
  let retries = 10;
  while (retries > 0) {
    try {
      await db.query('SELECT 1');
      console.log('[payment-service] Database terhubung');
      break;
    } catch {
      retries--;
      console.log(`[payment-service] Menunggu database... (${retries} tersisa)`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  await mq.connect();

  startExpireJob();

  app.listen(PORT, () => {
    console.log(`[payment-service] Berjalan di http://localhost:${PORT}`);
    console.log(`[payment-service] Endpoint kritis: POST /payments, GET /payments/:id`);
  });
}

start().catch(console.error);
