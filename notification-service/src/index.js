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

const notifRouter = require('./routes/notifications');
const db          = require('./db');

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
// Helper: simpan notifikasi ke DB
// ─────────────────────────────────────────────────────────────
async function saveNotification(user_id, type, title, message) {
  try {
    await db.query(
      'INSERT INTO notifications (user_id, type, title, message) VALUES ($1, $2, $3, $4)',
      [user_id, type, title, message]
    );
    console.log(`[notification-service] Notifikasi disimpan: ${type} → ${user_id}`);
  } catch (err) {
    console.error('[notification-service] Gagal simpan notifikasi:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────
// Handler pesan RabbitMQ
// ─────────────────────────────────────────────────────────────
async function handleMessage(routingKey, data) {
  console.log(`[notification-service] Event: ${routingKey}`, data);

  switch (routingKey) {
    case 'ticket.confirmed':
      await saveNotification(
        data.user_id,
        'ticket_confirmed',
        'Tiket Berhasil Dikonfirmasi!',
        `Selamat! Tiket kamu untuk ${data.event_name} (${data.seat_category} - Kursi ${data.seat_number}) sudah dikonfirmasi. QR Code: ${data.qr_code}`
      );
      await saveNotification(
        data.user_id,
        'eticket',
        'E-Tiket Kamu',
        `E-Tiket untuk ${data.event_name}. QR: ${data.qr_code}. Tunjukkan ini di pintu masuk.`
      );
      break;

    case 'payment.failed':
      await saveNotification(
        data.user_id,
        'payment_failed',
        'Pembayaran Gagal',
        `Pembayaranmu untuk order #${data.order_id} gagal diproses. Kursi masih terkunci. Coba bayar lagi sebelum waktu habis.`
      );
      break;

    case 'order.expired':
      await saveNotification(
        data.user_id,
        'order_expiring',
        'Pesanan Kedaluwarsa',
        `Pesananmu untuk ${data.event_name || 'konser'} (Order #${data.order_id}) sudah kedaluwarsa karena tidak dibayar. Kursi telah dilepas.`
      );
      break;

    case 'order.cancelled':
      await saveNotification(
        data.user_id,
        'order_cancelled',
        'Pesanan Dibatalkan',
        `Pesananmu #${data.order_id} telah dibatalkan. Kursi telah dilepas kembali ke sistem.`
      );
      break;

    case 'payment.cancelled':
      await saveNotification(
        data.user_id,
        'payment_refunded',
        'Refund Diproses',
        `Refund sebesar Rp ${Number(data.amount).toLocaleString('id-ID')} untuk pembayaran #${data.payment_id} sedang diproses.`
      );
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

  app.listen(PORT, () => {
    console.log(`[notification-service] Berjalan di http://localhost:${PORT}`);
    console.log(`[notification-service] Consumer aktif: ticket.confirmed, payment.failed, order.expired`);
  });
}

start().catch(console.error);
