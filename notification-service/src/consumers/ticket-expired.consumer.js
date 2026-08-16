/**
 * notification-service — consumers/ticket-expired.consumer.js
 * Consume event ticket.expired / order.expired → kirim notif kedaluwarsa
 */
const notifRepo = require('../modules/notification/notification.repository');

async function handle(data) {
  await notifRepo.save({
    userId: data.user_id,
    type: 'order_expiring',
    title: 'Pesanan Kedaluwarsa',
    message: `Pesananmu untuk ${data.event_name || 'konser'} (Order #${data.order_id}) sudah kedaluwarsa karena tidak dibayar. Kursi telah dilepas.`,
  });
  console.log(`[ticket-expired.consumer] Notif expired dikirim ke user ${data.user_id}`);
}

module.exports = { handle };
