/**
 * ticket-service — index.js
 * Entry point + background job untuk expired orders
 * Kelompok 5: Ashabul Kahfi (Backend/API Engineer)
 */
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const fetch   = require('node-fetch');

const ticketsRouter = require('./routes/tickets');
const db            = require('./db');
const mq            = require('./rabbitmq');

const app  = express();
const PORT = process.env.PORT || 3002;
const EVENT_SERVICE_URL = process.env.EVENT_SERVICE_URL || 'http://localhost:3001';

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

// ─────────────────────────────────────────────────────────────
// Background job: expired order cleanup (setiap 1 menit)
// Membebaskan kursi yang terkunci tapi tidak dibayar
// ─────────────────────────────────────────────────────────────
async function cleanupExpiredOrders() {
  try {
    const { rows: expired } = await db.query(
      `UPDATE orders SET status='expired', updated_at=NOW()
       WHERE status='locked' AND lock_expires_at <= NOW()
       RETURNING *`
    );

    for (const order of expired) {
      console.log(`[ticket-service] Order #${order.id} kedaluwarsa — melepas kursi`);

      // Kembalikan kursi ke event-service
      await fetch(
        `${EVENT_SERVICE_URL}/events/${order.event_id}/seats/increment`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seat_category_id: order.seat_category_id })
        }
      ).catch(err => console.error('[ticket-service] Gagal kembalikan kursi:', err.message));

      // Kirim notifikasi
      await mq.publish('order.expired', {
        order_id: order.id,
        user_id: order.user_id,
        event_id: order.event_id,
        event_name: order.event_name
      });
    }

    if (expired.length > 0) {
      console.log(`[ticket-service] ${expired.length} order kedaluwarsa diproses`);
    }
  } catch (err) {
    console.error('[ticket-service] Cleanup error:', err.message);
  }
}

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

  await mq.connect();

  // Jalankan cleanup setiap 60 detik
  setInterval(cleanupExpiredOrders, 60 * 1000);
  // Jalankan sekali saat start
  setTimeout(cleanupExpiredOrders, 5000);

  app.listen(PORT, () => {
    console.log(`[ticket-service] Berjalan di http://localhost:${PORT}`);
    console.log(`[ticket-service] Endpoints kritis: POST /orders, GET /orders/:id, POST /orders/:id/cancel`);
  });
}

start().catch(console.error);
