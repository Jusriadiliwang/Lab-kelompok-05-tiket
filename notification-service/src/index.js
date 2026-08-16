/**
 * notification-service — index.js
 * Consumer RabbitMQ + REST API untuk notifikasi
 * Kelompok 5: Ashabul Kahfi (Backend/API Engineer)
 */
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const amqp    = require('amqplib');

const notifRouter = require('./modules/notification/notification.controller');
const db          = require('./database');

const ticketConfirmedConsumer = require('./consumers/ticket-confirmed.consumer');
const ticketExpiredConsumer   = require('./consumers/ticket-expired.consumer');
const paymentFailedConsumer   = require('./consumers/payment-failed.consumer');
const { start: startRetryJob } = require('./jobs/retry-failed-notif.job');

const app      = express();
const PORT     = process.env.PORT || 3004;
const EXCHANGE = 'tiket_events';

app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

app.use('/', notifRouter);

app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', service: 'notification-service', timestamp: new Date() });
  } catch {
    res.status(503).json({ status: 'error', service: 'notification-service' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'not_found', message: `${req.method} ${req.path} tidak ditemukan` });
});

// ─────────────────────────────────────────────────────────────
// Handler pesan RabbitMQ
// ─────────────────────────────────────────────────────────────
async function handleMessage(routingKey, data) {
  console.log(`[notification-service] Event: ${routingKey}`, data);
  switch (routingKey) {
    case 'ticket.confirmed':
      await ticketConfirmedConsumer.handle(data);
      break;
    case 'ticket.expired':
    case 'order.expired':
      await ticketExpiredConsumer.handle(data);
      break;
    case 'payment.failed':
      await paymentFailedConsumer.handle(data);
      break;
    case 'payment.cancelled':
    case 'order.cancelled':
      await paymentFailedConsumer.handle({ ...data, order_id: data.order_id || data.payment_id });
      break;
    default:
      console.log(`[notification-service] Event tidak dikenal: ${routingKey}`);
  }
}

// ─────────────────────────────────────────────────────────────
// Koneksi RabbitMQ Consumer
// ─────────────────────────────────────────────────────────────
async function connectRabbitMQ() {
  let retries = 10;
  while (retries > 0) {
    try {
      const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
      const ch   = await conn.createChannel();

      await ch.assertExchange(EXCHANGE, 'topic', { durable: true });

      // Queue untuk semua event yang relevan
      const q = await ch.assertQueue('notification.all_events', { durable: true });

      // Subscribe ke semua event
      const patterns = [
        'ticket.confirmed',
        'ticket.expired',
        'payment.failed',
        'payment.cancelled',
        'order.expired',
        'order.cancelled'
      ];

      for (const pattern of patterns) {
        await ch.bindQueue(q.queue, EXCHANGE, pattern);
      }

      // Proses satu pesan per consumer (tidak overload)
      ch.prefetch(5);

      ch.consume(q.queue, async (msg) => {
        if (!msg) return;
        try {
          const data = JSON.parse(msg.content.toString());
          await handleMessage(msg.fields.routingKey, data);
          ch.ack(msg);
        } catch (err) {
          console.error('[notification-service] Error proses pesan:', err.message);
          ch.nack(msg, false, false);
        }
      });

      conn.on('error', (err) => {
        console.error('[notification-service] RabbitMQ error:', err.message);
      });

      console.log('[notification-service] RabbitMQ consumer aktif');
      return;
    } catch (err) {
      retries--;
      console.log(`[notification-service] Menunggu RabbitMQ... (${retries} tersisa)`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

// ── Start ─────────────────────────────────────────────────────
async function start() {
  let retries = 10;
  while (retries > 0) {
    try {
      await db.query('SELECT 1');
      console.log('[notification-service] Database terhubung');
      break;
    } catch {
      retries--;
      console.log(`[notification-service] Menunggu database... (${retries} tersisa)`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  await connectRabbitMQ();

  startRetryJob();

  app.listen(PORT, () => {
    console.log(`[notification-service] Berjalan di http://localhost:${PORT}`);
    console.log(`[notification-service] Consumer aktif: ticket.confirmed, payment.failed, order.expired`);
  });
}

start().catch(console.error);
