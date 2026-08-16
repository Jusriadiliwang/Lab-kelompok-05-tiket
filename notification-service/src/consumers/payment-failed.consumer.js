/**
 * notification-service — consumers/payment-failed.consumer.js
 * Consume event payment.failed → kirim notif gagal bayar
 */
const notifRepo = require('../modules/notification/notification.repository');

async function handle(data) {
  await notifRepo.save({
    userId: data.user_id,
    type: 'payment_failed',
    title: 'Pembayaran Gagal',
    message: `Pembayaranmu untuk order #${data.order_id} gagal diproses. Kursi masih terkunci. Coba bayar lagi sebelum waktu habis.`,
  });
  console.log(`[payment-failed.consumer] Notif gagal bayar dikirim ke user ${data.user_id}`);
}

module.exports = { handle };
