/**
 * ticket-service — routes/tickets.js
 * ─────────────────────────────────────────────────────────────
 * INTI SISTEM — Mencegah overselling kursi
 *
 * Strategi kunci ganda:
 *  1. Redis SET NX (distributed lock) — cegah race condition antar pod
 *  2. PostgreSQL SELECT FOR UPDATE — atomic pada level DB
 *  3. available_seats di event-service dikurangi via HTTP call
 *
 * Kelompok 5:
 *   Ashabul Kahfi  — REST API
 *   Jusriadi Liwang — DB transactions & query
 *   Miftahul Jannah — Arsitektur lock strategy
 * ─────────────────────────────────────────────────────────────
 */
const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const fetch   = require('node-fetch');

const db      = require('../db');
const mq      = require('../rabbitmq');

const LOCK_TTL_MINUTES  = parseInt(process.env.LOCK_TTL_MINUTES) || 15;
const EVENT_SERVICE_URL = process.env.EVENT_SERVICE_URL || 'http://localhost:3001';

// ─────────────────────────────────────────────────────────────
// Helper: Redis distributed lock
// ─────────────────────────────────────────────────────────────
let redis;
function getRedis() {
  if (!redis) {
    const Redis = require('ioredis');
    redis = new Redis({
      host:     process.env.REDIS_HOST     || 'localhost',
      port:     parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || 'tiketkonser123',
      lazyConnect: true,
    });
    redis.on('error', (e) => console.error('[Redis]', e.message));
  }
  return redis;
}

async function acquireLock(key, ttlMs = 10000) {
  const lockKey = `lock:seat:${key}`;
  const token   = uuidv4();
  const result  = await getRedis().set(lockKey, token, 'PX', ttlMs, 'NX');
  return result === 'OK' ? { lockKey, token } : null;
}

async function releaseLock(lockKey, token) {
  // Lua script untuk atomic check-and-delete
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  await getRedis().eval(script, 1, lockKey, token);
}

// ─────────────────────────────────────────────────────────────
// POST /orders  — ENDPOINT PALING KRITIS
// Kunci kursi sementara (15 menit)
// ─────────────────────────────────────────────────────────────
router.post('/orders', async (req, res) => {
  const { user_id, event_id, seat_category_id } = req.body;

  if (!user_id || !event_id || !seat_category_id) {
    return res.status(400).json({
      error: 'bad_request',
      message: 'user_id, event_id, seat_category_id wajib diisi'
    });
  }

  // 1. Cek apakah user sudah punya order aktif untuk event ini
  const { rows: existing } = await db.query(
    `SELECT id FROM orders
     WHERE user_id=$1 AND event_id=$2 AND status='locked' AND lock_expires_at > NOW()`,
    [user_id, event_id]
  );
  if (existing.length > 0) {
    return res.status(409).json({
      error: 'duplicate_order',
      message: 'Kamu sudah memiliki pesanan aktif untuk konser ini',
      order_id: existing[0].id
    });
  }

  // 2. Ambil Redis distributed lock — cegah race condition antar instance
  const lockKey  = `${event_id}:${seat_category_id}:${user_id}`;
  const lock = await acquireLock(lockKey, 8000);
  if (!lock) {
    return res.status(429).json({
      error: 'too_many_requests',
      message: 'Terlalu banyak permintaan untuk kursi ini, coba lagi sebentar'
    });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 3. Minta event-service kurangi available_seats (atomic di event-service)
    const seatRes = await fetch(
      `${EVENT_SERVICE_URL}/events/${event_id}/seats/decrement`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seat_category_id })
      }
    );

    if (!seatRes.ok) {
      await client.query('ROLLBACK');
      const errBody = await seatRes.json();
      return res.status(seatRes.status === 409 ? 409 : 502).json({
        error: errBody.error || 'seat_unavailable',
        message: errBody.message || 'Kursi tidak tersedia'
      });
    }

    const seatData = await seatRes.json();

    // 4. Buat order di ticket-service DB
    const expiresAt = new Date(Date.now() + LOCK_TTL_MINUTES * 60 * 1000);
    const { rows: [order] } = await client.query(
      `INSERT INTO orders
         (user_id, event_id, seat_category_id, event_name, seat_category_name, price, status, lock_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'locked', $7)
       RETURNING *`,
      [user_id, event_id, seat_category_id, seatData.event_id || event_id,
       seatData.name, seatData.price, expiresAt]
    );

    await client.query('COMMIT');

    // 5. Publish event ke RabbitMQ
    await mq.publish('order.created', {
      order_id: order.id,
      user_id,
      event_id,
      seat_category_id,
      price: seatData.price,
      expires_at: expiresAt
    });

    res.status(201).json({
      ...order,
      message: `Kursi dikunci selama ${LOCK_TTL_MINUTES} menit. Segera bayar sebelum kedaluwarsa.`
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[POST /orders]', err.message);
    res.status(500).json({ error: 'internal_error', message: err.message });
  } finally {
    client.release();
    await releaseLock(lock.lockKey, lock.token);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /orders — daftar order milik user
// ─────────────────────────────────────────────────────────────
router.get('/orders', async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'bad_request', message: 'user_id wajib' });

  try {
    const { rows } = await db.query(
      `SELECT * FROM orders WHERE user_id=$1 ORDER BY created_at DESC`,
      [user_id]
    );
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// GET /orders/:id
router.get('/orders/:id', async (req, res) => {
  try {
    const { rows: [order] } = await db.query(
      'SELECT * FROM orders WHERE id=$1', [req.params.id]
    );
    if (!order) return res.status(404).json({ error: 'not_found', message: 'Order tidak ditemukan' });

    // Cek kalau expired
    if (order.status === 'locked' && new Date(order.lock_expires_at) < new Date()) {
      await db.query(
        "UPDATE orders SET status='expired', updated_at=NOW() WHERE id=$1",
        [order.id]
      );
      order.status = 'expired';
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// POST /orders/:id/cancel — batalkan order dan lepas kursi
router.post('/orders/:id/cancel', async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { rows: [order] } = await client.query(
      "SELECT * FROM orders WHERE id=$1 AND status='locked' FOR UPDATE",
      [req.params.id]
    );
    if (!order) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'not_found', message: 'Order tidak ditemukan atau sudah tidak aktif' });
    }

    await client.query(
      "UPDATE orders SET status='cancelled', updated_at=NOW() WHERE id=$1",
      [order.id]
    );

    // Kembalikan kursi ke event-service
    await fetch(
      `${EVENT_SERVICE_URL}/events/${order.event_id}/seats/increment`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seat_category_id: order.seat_category_id })
      }
    );

    await client.query('COMMIT');

    await mq.publish('order.cancelled', {
      order_id: order.id,
      user_id: order.user_id,
      event_id: order.event_id,
      seat_category_id: order.seat_category_id
    });

    res.json({ ...order, status: 'cancelled' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'internal_error', message: err.message });
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────
// POST /orders/:id/confirm — internal: konfirmasi setelah bayar
// (dipanggil oleh payment-service lewat RabbitMQ consumer)
// ─────────────────────────────────────────────────────────────
router.post('/orders/:id/confirm', async (req, res) => {
  const { payment_id } = req.body;
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const { rows: [order] } = await client.query(
      `SELECT * FROM orders WHERE id=$1 AND status='locked' AND lock_expires_at > NOW() FOR UPDATE`,
      [req.params.id]
    );
    if (!order) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'order_invalid', message: 'Order tidak valid atau sudah kedaluwarsa' });
    }

    await client.query(
      "UPDATE orders SET status='confirmed', updated_at=NOW() WHERE id=$1",
      [order.id]
    );

    // Buat tiket resmi
    const qrCode  = `QR-${uuidv4()}`;
    const seatNum = `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 100) + 1}`;
    const { rows: [ticket] } = await client.query(
      `INSERT INTO tickets (order_id, user_id, event_name, seat_category, seat_number, qr_code)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [order.id, order.user_id, order.event_name, order.seat_category_name, seatNum, qrCode]
    );

    await client.query('COMMIT');

    await mq.publish('ticket.confirmed', {
      ticket_id: ticket.id,
      order_id: order.id,
      user_id: order.user_id,
      event_name: order.event_name,
      seat_category: order.seat_category_name,
      seat_number: seatNum,
      qr_code: qrCode,
      payment_id
    });

    res.json({ order: { ...order, status: 'confirmed' }, ticket });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'internal_error', message: err.message });
  } finally {
    client.release();
  }
});

// GET /tickets/:id
router.get('/tickets/:id', async (req, res) => {
  try {
    const { rows: [ticket] } = await db.query(
      'SELECT * FROM tickets WHERE id=$1', [req.params.id]
    );
    if (!ticket) return res.status(404).json({ error: 'not_found', message: 'Tiket tidak ditemukan' });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

module.exports = router;
