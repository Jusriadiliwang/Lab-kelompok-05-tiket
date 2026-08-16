/**
 * ticket-service — modules/reservation/reservation.controller.js
 * HTTP handler untuk resource Order dan Ticket
 * Kelompok 5: Ashabul Kahfi (Backend/API Engineer)
 */
const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const fetch   = require('node-fetch');

const db              = require('../../database');
const reservationRepo = require('./reservation.repository');
const seatLockService = require('../seat-lock/seat-lock.service');
const ticketLockedProducer = require('../../producers/ticket-locked.producer');
const mq              = require('../../rabbitmq');

const LOCK_TTL_MINUTES  = parseInt(process.env.LOCK_TTL_MINUTES) || 15;
const EVENT_SERVICE_URL = process.env.EVENT_SERVICE_URL || 'http://localhost:3001';

// GET / — info service
router.get('/', (req, res) => {
  res.json({
    service: 'ticket-service',
    version: '1.0.0',
    status: 'running',
    endpoints: [
      'POST /orders',
      'GET  /orders',
      'GET  /orders/:id',
      'POST /orders/:id/cancel',
      'POST /orders/:id/confirm',
      'GET  /tickets/:id',
    ],
  });
});

// POST /orders — kunci kursi
router.post('/orders', async (req, res) => {
  const { user_id, event_id, seat_category_id } = req.body;
  if (!user_id || !event_id || !seat_category_id) {
    return res.status(400).json({ error: 'bad_request', message: 'user_id, event_id, seat_category_id wajib diisi' });
  }

  const existing = await reservationRepo.findActiveForUser(user_id, event_id);
  if (existing.length > 0) {
    return res.status(409).json({ error: 'duplicate_order', message: 'Kamu sudah memiliki pesanan aktif untuk konser ini', order_id: existing[0].id });
  }

  const lockKey = `${event_id}:${seat_category_id}:${user_id}`;
  const lock = await seatLockService.acquireLock(lockKey, 8000);
  if (!lock) {
    return res.status(429).json({ error: 'too_many_requests', message: 'Terlalu banyak permintaan untuk kursi ini, coba lagi sebentar' });
  }

  const client = await db.connect();
  let seatData = null;
  try {
    await client.query('BEGIN');

    const seatRes = await fetch(`${EVENT_SERVICE_URL}/events/${event_id}/seats/decrement`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seat_category_id }),
    });

    if (!seatRes.ok) {
      await client.query('ROLLBACK');
      const errBody = await seatRes.json();
      return res.status(seatRes.status === 409 ? 409 : 502).json({ error: errBody.error || 'seat_unavailable', message: errBody.message || 'Kursi tidak tersedia' });
    }

    seatData = await seatRes.json();

    const expiresAt = new Date(Date.now() + LOCK_TTL_MINUTES * 60 * 1000);
    const order = await reservationRepo.create(client, {
      userId: user_id, eventId: event_id, seatCategoryId: seat_category_id,
      eventName: seatData.event_name || `Event #${event_id}`,
      seatCategoryName: seatData.name, price: seatData.price, expiresAt,
    });

    await client.query('COMMIT');

    await ticketLockedProducer.publish({ order_id: order.id, user_id, event_id, seat_category_id, price: seatData.price, expires_at: expiresAt });

    res.status(201).json({ ...order, message: `Kursi dikunci selama ${LOCK_TTL_MINUTES} menit. Segera bayar sebelum kedaluwarsa.` });
  } catch (err) {
    await client.query('ROLLBACK');
    if (seatData) {
      await fetch(`${EVENT_SERVICE_URL}/events/${event_id}/seats/increment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seat_category_id }),
      }).catch(e => console.error('[POST /orders] Gagal kompensasi kursi:', e.message));
    }
    console.error('[POST /orders]', err.message);
    res.status(500).json({ error: 'internal_error', message: err.message });
  } finally {
    client.release();
    await seatLockService.releaseLock(lock.lockKey, lock.token);
  }
});

// GET /orders
router.get('/orders', async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'bad_request', message: 'user_id wajib' });
  try {
    const data = await reservationRepo.findByUser(user_id);
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// GET /orders/:id
router.get('/orders/:id', async (req, res) => {
  try {
    const order = await reservationRepo.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'not_found', message: 'Order tidak ditemukan' });
    if (order.status === 'locked' && new Date(order.lock_expires_at) < new Date()) {
      await db.query("UPDATE orders SET status='expired', updated_at=NOW() WHERE id=$1", [order.id]);
      order.status = 'expired';
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// POST /orders/:id/cancel
router.post('/orders/:id/cancel', async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const order = await reservationRepo.cancel(client, req.params.id);
    if (!order) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'not_found', message: 'Order tidak ditemukan atau sudah tidak aktif' });
    }

    const incrRes = await fetch(`${EVENT_SERVICE_URL}/events/${order.event_id}/seats/increment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seat_category_id: order.seat_category_id }),
    });

    if (!incrRes.ok) {
      await client.query('ROLLBACK');
      return res.status(502).json({ error: 'seat_restore_failed', message: 'Gagal mengembalikan kursi ke stok, coba lagi' });
    }

    await client.query('COMMIT');
    await mq.publish('order.cancelled', { order_id: order.id, user_id: order.user_id, event_id: order.event_id, seat_category_id: order.seat_category_id });
    res.json({ ...order, status: 'cancelled' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'internal_error', message: err.message });
  } finally {
    client.release();
  }
});

// POST /orders/:id/confirm — internal: dipanggil saat payment.confirmed
router.post('/orders/:id/confirm', async (req, res) => {
  const { payment_id } = req.body;
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const order = await reservationRepo.confirm(client, req.params.id);
    if (!order) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'order_invalid', message: 'Order tidak valid atau sudah kedaluwarsa' });
    }

    const qrCode  = `QR-${uuidv4()}`;
    const seatNum = `SEAT-${order.id}`;
    const ticket  = await reservationRepo.createTicket(client, {
      orderId: order.id, userId: order.user_id, eventName: order.event_name,
      seatCategory: order.seat_category_name, seatNumber: seatNum, qrCode,
    });

    await client.query('COMMIT');
    await mq.publish('ticket.confirmed', { ticket_id: ticket.id, order_id: order.id, user_id: order.user_id, event_name: order.event_name, seat_category: order.seat_category_name, seat_number: seatNum, qr_code: qrCode, payment_id });
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
    const ticket = await reservationRepo.findTicketById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'not_found', message: 'Tiket tidak ditemukan' });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

module.exports = router;
