/**
 * notification-service — consumers/ticket-confirmed.consumer.js
 * Consume event ticket.confirmed → kirim e-ticket
 */
const notifRepo = require('../modules/notification/notification.repository');

async function handle(data) {
  await notifRepo.save({
    userId: data.user_id,
    type: 'ticket_confirmed',
    title: 'Tiket Berhasil Dikonfirmasi!',
    message: `Selamat! Tiket kamu untuk ${data.event_name} (${data.seat_category} - Kursi ${data.seat_number}) sudah dikonfirmasi. QR Code: ${data.qr_code}`,
  });
  await notifRepo.save({
    userId: data.user_id,
    type: 'eticket',
    title: 'E-Tiket Kamu',
    message: `E-Tiket untuk ${data.event_name}. QR: ${data.qr_code}. Tunjukkan ini di pintu masuk.`,
  });
  console.log(`[ticket-confirmed.consumer] E-tiket dikirim ke user ${data.user_id}`);
}

module.exports = { handle };
