/**
 * ticket-service — consumers/payment-failed.consumer.js
 * Consume event payment.failed → cancel reservation
 */
const db = require('../database');
const reservationRepo = require('../modules/reservation/reservation.repository');
const seatLockService = require('../modules/seat-lock/seat-lock.service');
const fetch = require('node-fetch');

const EVENT_SERVICE_URL = process.env.EVENT_SERVICE_URL || 'http://localhost:3001';

async function handle(data) {
  const { order_id } = data;
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const order = await reservationRepo.cancel(client, order_id);
    if (!order) {
      await client.query('ROLLBACK');
      console.warn(`[payment-failed.consumer] Order ${order_id} tidak ditemukan`);
      return;
    }
    await client.query('COMMIT');

    // Kembalikan kursi ke event-service
    await fetch(`${EVENT_SERVICE_URL}/events/${order.event_id}/seats/increment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seat_category_id: order.seat_category_id }),
    }).catch(e => console.error('[payment-failed.consumer] Gagal kembalikan kursi:', e.message));

    // Hapus lock Redis
    await seatLockService.deleteLock(`${order.event_id}:${order.seat_category_id}:${order.user_id}`);

    console.log(`[payment-failed.consumer] Reservation ${order_id} dibatalkan`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[payment-failed.consumer] Error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { handle };
