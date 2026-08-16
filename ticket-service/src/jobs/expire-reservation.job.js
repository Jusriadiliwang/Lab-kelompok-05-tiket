/**
 * ticket-service — jobs/expire-reservation.job.js
 * Cron setiap 1 menit: expire reservation yang lewat batas + lepas lock Redis
 * Kelompok 5: Ashabul Kahfi (Backend/API Engineer)
 */
const reservationRepo = require('../modules/reservation/reservation.repository');
const seatLockService = require('../modules/seat-lock/seat-lock.service');
const ticketExpiredProducer = require('../producers/ticket-expired.producer');
const fetch = require('node-fetch');

const EVENT_SERVICE_URL = process.env.EVENT_SERVICE_URL || 'http://localhost:3001';

async function run() {
  try {
    const expired = await reservationRepo.findExpiredPending();

    for (const order of expired) {
      console.log(`[expire-reservation] Order #${order.id} kedaluwarsa — melepas kursi`);

      // Kembalikan kursi ke event-service
      await fetch(`${EVENT_SERVICE_URL}/events/${order.event_id}/seats/increment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seat_category_id: order.seat_category_id }),
      }).catch(e => console.error(`[expire-reservation] Gagal kembalikan kursi order #${order.id}:`, e.message));

      // Hapus lock Redis (jangan hapus yang SOLD)
      await seatLockService.deleteLock(`${order.event_id}:${order.seat_category_id}:${order.user_id}`);

      // Publish event ticket.expired
      await ticketExpiredProducer.publish({
        order_id: order.id,
        user_id: order.user_id,
        event_id: order.event_id,
        event_name: order.event_name,
      });
    }

    if (expired.length > 0) {
      console.log(`[expire-reservation] ${expired.length} order kedaluwarsa diproses`);
    }
  } catch (err) {
    console.error('[expire-reservation] Error:', err.message);
  }
}

function start() {
  setInterval(run, 60 * 1000);
  setTimeout(run, 5000); // jalankan sekali saat startup
  console.log('[expire-reservation] Job aktif — interval 1 menit');
}

module.exports = { start, run };
