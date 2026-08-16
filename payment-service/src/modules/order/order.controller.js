/**
 * payment-service — modules/order/order.controller.js
 * HTTP handler untuk resource Payment
 */
const express = require('express');
const router  = express.Router();
const fetch   = require('node-fetch');

const db           = require('../../database');
const orderRepo    = require('./order.repository');
const gateway      = require('../../gateway/payment-gateway.adapter');
const paymentConfirmedProducer = require('../../producers/payment-confirmed.producer');
const paymentFailedProducer    = require('../../producers/payment-failed.producer');
const mq           = require('../../rabbitmq');

const TICKET_SERVICE_URL  = process.env.TICKET_SERVICE_URL  || 'http://localhost:3002';

const VALID_METHODS = ['bank_transfer', 'credit_card', 'gopay', 'ovo', 'dana'];

// GET / — info service
router.get('/', (req, res) => {
  res.json({
    service: 'payment-service',
    version: '1.0.0',
    status: 'running',
    endpoints: ['POST /payments', 'GET /payments', 'GET /payments/:id', 'POST /payments/:id/cancel'],
  });
});

// POST /payments — proses pembayaran
router.post('/payments', async (req, res) => {
  const { order_id, user_id, method } = req.body;
  if (!order_id || !user_id || !method) {
    return res.status(400).json({ error: 'bad_request', message: 'order_id, user_id, method wajib diisi' });
  }
  if (!VALID_METHODS.includes(method)) {
    return res.status(400).json({ error: 'bad_request', message: `method harus salah satu dari: ${VALID_METHODS.join(', ')}` });
  }

  // Cek duplikasi
  const existing = await orderRepo.findByOrderAndStatus(order_id, ['pending', 'success']);
  if (existing.length > 0) {
    return res.status(409).json({ error: 'duplicate_payment', message: 'Pembayaran untuk order ini sudah ada', payment_id: existing[0].id, status: existing[0].status });
  }

  // Ambil data order dari ticket-service
  let orderData;
  try {
    const orderRes = await fetch(`${TICKET_SERVICE_URL}/orders/${order_id}`);
    if (!orderRes.ok) return res.status(404).json({ error: 'order_not_found', message: 'Order tidak ditemukan' });
    orderData = await orderRes.json();
  } catch {
    return res.status(502).json({ error: 'service_unavailable', message: 'ticket-service tidak dapat dihubungi' });
  }

  if (orderData.status !== 'locked') {
    return res.status(409).json({ error: 'order_not_lockable', message: `Order berstatus '${orderData.status}', tidak bisa dibayar` });
  }
  if (new Date(orderData.lock_expires_at) < new Date()) {
    return res.status(409).json({ error: 'order_expired', message: 'Waktu kunci kursi sudah habis. Silakan buat pesanan baru.' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const payment = await orderRepo.create(client, { orderId: order_id, userId: user_id, amount: orderData.price, method });
    const success = await gateway.charge(method, orderData.price);

    if (success) {
      const updated = await orderRepo.updateStatus(client, payment.id, 'success');
      await client.query('COMMIT');

      // Konfirmasi ke ticket-service
      const confirmRes = await fetch(`${TICKET_SERVICE_URL}/orders/${order_id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: payment.id }),
      });
      if (!confirmRes.ok) {
        const errBody = await confirmRes.json().catch(() => ({}));
        console.error(`[POST /payments] KRITIS: Payment ${payment.id} sukses tapi konfirmasi tiket GAGAL!`, errBody);
      }

      await paymentConfirmedProducer.publish({ payment_id: updated.id, order_id, user_id, amount: updated.amount, method, paid_at: updated.paid_at });
      return res.status(201).json({ ...updated, message: 'Pembayaran berhasil! E-tiket akan segera dikirim.' });
    } else {
      const failed = await orderRepo.updateStatus(client, payment.id, 'failed');
      await client.query('COMMIT');
      await paymentFailedProducer.publish({ payment_id: failed.id, order_id, user_id, reason: 'DECLINED' });
      return res.status(402).json({ ...failed, message: 'Pembayaran gagal. Kursi tetap terkunci hingga masa berlaku habis.' });
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[POST /payments]', err.message);
    res.status(500).json({ error: 'internal_error', message: err.message });
  } finally {
    client.release();
  }
});

// GET /payments/:id
router.get('/payments/:id', async (req, res) => {
  try {
    const payment = await orderRepo.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'not_found', message: 'Pembayaran tidak ditemukan' });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// POST /payments/:id/cancel — refund
router.post('/payments/:id/cancel', async (req, res) => {
  try {
    const payment = await orderRepo.markRefunded(req.params.id);
    if (!payment) return res.status(404).json({ error: 'not_found', message: 'Pembayaran tidak ditemukan atau tidak bisa dibatalkan' });
    await mq.publish('payment.cancelled', { payment_id: payment.id, order_id: payment.order_id, user_id: payment.user_id, amount: payment.amount });
    res.json({ ...payment, message: 'Refund sedang diproses' });
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// GET /payments
router.get('/payments', async (req, res) => {
  const { order_id, user_id } = req.query;
  if (!order_id && !user_id) return res.status(400).json({ error: 'bad_request', message: 'order_id atau user_id wajib' });
  try {
    const data = await orderRepo.findByFilter({ orderId: order_id, userId: user_id });
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

module.exports = router;
