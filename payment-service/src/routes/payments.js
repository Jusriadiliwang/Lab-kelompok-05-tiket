/**
 * payment-service — routes/payments.js
 * Terima pembayaran, konfirmasi, batalkan bila gagal atau lewat batas waktu
 * Kelompok 5: Ashabul Kahfi (Backend/API Engineer)
 */
const express = require('express');
const router  = express.Router();
const fetch   = require('node-fetch');

const db = require('../db');
const mq = require('../rabbitmq');

const TICKET_SERVICE_URL   = process.env.TICKET_SERVICE_URL   || 'http://localhost:3002';
const PAYMENT_TIMEOUT_MIN  = parseInt(process.env.PAYMENT_TIMEOUT_MINUTES) || 15;

// ─────────────────────────────────────────────────────────────
// POST /payments  — ENDPOINT KRITIS #3
// Proses pembayaran untuk pesanan yang terkunci
// ─────────────────────────────────────────────────────────────
router.post('/payments', async (req, res) => {
  const { order_id, user_id, method } = req.body;

  if (!order_id || !user_id || !method) {
    return res.status(400).json({
      error: 'bad_request',
      message: 'order_id, user_id, method wajib diisi'
    });
  }

  const validMethods = ['bank_transfer', 'credit_card', 'gopay', 'ovo', 'dana'];
  if (!validMethods.includes(method)) {
    return res.status(400).json({
      error: 'bad_request',
      message: `method harus salah satu dari: ${validMethods.join(', ')}`
    });
  }

  // Cek duplikasi pembayaran untuk order yang sama
  const { rows: existing } = await db.query(
    `SELECT id, status FROM payments WHERE order_id=$1 AND status IN ('pending','success')`,
    [order_id]
  );
  if (existing.length > 0) {
    return res.status(409).json({
      error: 'duplicate_payment',
      message: 'Pembayaran untuk order ini sudah ada',
      payment_id: existing[0].id,
      status: existing[0].status
    });
  }

  // Ambil status order dari ticket-service
  let orderData;
  try {
    const orderRes = await fetch(`${TICKET_SERVICE_URL}/orders/${order_id}`);
    if (!orderRes.ok) {
      return res.status(404).json({ error: 'order_not_found', message: 'Order tidak ditemukan' });
    }
    orderData = await orderRes.json();
  } catch (err) {
    return res.status(502).json({ error: 'service_unavailable', message: 'ticket-service tidak dapat dihubungi' });
  }

  if (orderData.status !== 'locked') {
    return res.status(409).json({
      error: 'order_not_lockable',
      message: `Order berstatus '${orderData.status}', tidak bisa dibayar`
    });
  }

  if (new Date(orderData.lock_expires_at) < new Date()) {
    return res.status(409).json({
      error: 'order_expired',
      message: 'Waktu kunci kursi sudah habis. Silakan buat pesanan baru.'
    });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Buat record pembayaran dengan status pending
    const { rows: [payment] } = await client.query(
      `INSERT INTO payments (order_id, user_id, amount, method, status)
       VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
      [order_id, user_id, orderData.price, method]
    );

    // Simulasi payment gateway (dalam produksi: integrasikan dengan Midtrans/Xendit/dll)
    const paymentSuccess = await simulatePaymentGateway(method, orderData.price);

    if (paymentSuccess) {
      // Update status payment
      const { rows: [updated] } = await client.query(
        `UPDATE payments SET status='success', paid_at=NOW(), updated_at=NOW()
         WHERE id=$1 RETURNING *`,
        [payment.id]
      );

      await client.query('COMMIT');

      // Konfirmasi ke ticket-service via HTTP
      const confirmRes = await fetch(`${TICKET_SERVICE_URL}/orders/${order_id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: payment.id })
      });

      // Publish event pembayaran berhasil
      await mq.publish('payment.success', {
        payment_id: updated.id,
        order_id,
        user_id,
        amount: updated.amount,
        method,
        paid_at: updated.paid_at
      });

      res.status(201).json({
        ...updated,
        message: 'Pembayaran berhasil! E-tiket akan segera dikirim.'
      });

    } else {
      // Pembayaran gagal
      const { rows: [failed] } = await client.query(
        `UPDATE payments SET status='failed', updated_at=NOW()
         WHERE id=$1 RETURNING *`,
        [payment.id]
      );

      await client.query('COMMIT');

      // Publish event pembayaran gagal
      await mq.publish('payment.failed', {
        payment_id: failed.id,
        order_id,
        user_id,
        reason: 'Pembayaran ditolak oleh gateway'
      });

      res.status(402).json({
        ...failed,
        message: 'Pembayaran gagal. Kursi tetap terkunci hingga masa berlaku habis.'
      });
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[POST /payments]', err.message);
    res.status(500).json({ error: 'internal_error', message: err.message });
  } finally {
    client.release();
  }
});

/**
 * Simulasi payment gateway
 * Dalam produksi, ini diganti dengan API call ke Midtrans/Xendit/dll
 * Sukses rate 90% untuk simulasi
 */
async function simulatePaymentGateway(method, amount) {
  // Simulasi delay jaringan payment gateway (100-500ms)
  await new Promise(r => setTimeout(r, Math.random() * 400 + 100));
  // 90% sukses untuk simulasi
  return Math.random() < 0.9;
}

// GET /payments/:id
router.get('/payments/:id', async (req, res) => {
  try {
    const { rows: [payment] } = await db.query(
      'SELECT * FROM payments WHERE id=$1', [req.params.id]
    );
    if (!payment) return res.status(404).json({ error: 'not_found', message: 'Pembayaran tidak ditemukan' });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// POST /payments/:id/cancel — refund
router.post('/payments/:id/cancel', async (req, res) => {
  try {
    const { rows: [payment] } = await db.query(
      `UPDATE payments SET status='cancelled', updated_at=NOW()
       WHERE id=$1 AND status='success' RETURNING *`,
      [req.params.id]
    );
    if (!payment) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Pembayaran tidak ditemukan atau tidak bisa dibatalkan'
      });
    }

    await mq.publish('payment.cancelled', {
      payment_id: payment.id,
      order_id: payment.order_id,
      user_id: payment.user_id,
      amount: payment.amount
    });

    res.json({ ...payment, message: 'Refund sedang diproses' });
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// GET /payments?order_id=x — status payment untuk order tertentu
router.get('/payments', async (req, res) => {
  const { order_id, user_id } = req.query;
  if (!order_id && !user_id) {
    return res.status(400).json({ error: 'bad_request', message: 'order_id atau user_id wajib' });
  }

  try {
    let query = 'SELECT * FROM payments WHERE 1=1';
    const params = [];
    if (order_id)  { params.push(order_id);  query += ` AND order_id=$${params.length}`; }
    if (user_id)   { params.push(user_id);   query += ` AND user_id=$${params.length}`; }
    query += ' ORDER BY created_at DESC';

    const { rows } = await db.query(query, params);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

module.exports = router;
