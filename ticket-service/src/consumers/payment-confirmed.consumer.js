/**
 * ticket-service — consumers/payment-confirmed.consumer.js
 * Consume event payment.confirmed → konfirmasi reservation
 */
const db = require('../database');
const reservationRepo = require('../modules/reservation/reservation.repository');
const seatLockService = require('../modules/seat-lock/seat-lock.service');
const ticketConfirmedProducer = require('../producers/ticket-confirmed.producer');
const { v4: uuidv4 } = require('uuid');

async function handle(data) {
  const { order_id, user_id, payment_id } = data;
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const order = await reservationRepo.confirm(client, order_id);
    if (!order) {
      await client.query('ROLLBACK');
      console.warn(`[payment-confirmed.consumer] Order ${order_id} tidak valid atau sudah kedaluwarsa`);
      return;
    }

    const qrCode  = `QR-${uuidv4()}`;
    const seatNum = `SEAT-${order.id}`;
    const ticket  = await reservationRepo.createTicket(client, {
      orderId: order.id,
      userId: order.user_id,
      eventName: order.event_name,
      seatCategory: order.seat_category_name,
      seatNumber: seatNum,
      qrCode,
    });

    await client.query('COMMIT');

    // Tandai kursi sebagai SOLD di Redis (tanpa TTL)
    await seatLockService.markSold(`${order.event_id}:${order.seat_category_id}:${user_id}`);

    await ticketConfirmedProducer.publish({
      ticket_id: ticket.id,
      order_id: order.id,
      user_id: order.user_id,
      event_name: order.event_name,
      seat_category: order.seat_category_name,
      seat_number: seatNum,
      qr_code: qrCode,
      payment_id,
    });

    console.log(`[payment-confirmed.consumer] Reservation ${order_id} dikonfirmasi`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[payment-confirmed.consumer] Error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { handle };
