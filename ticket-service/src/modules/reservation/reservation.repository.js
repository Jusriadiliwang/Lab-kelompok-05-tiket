/**
 * ticket-service — modules/reservation/reservation.repository.js
 * Query layer untuk tabel orders dan tickets
 */
const db = require('../../database');

async function findExpiredPending() {
  const { rows } = await db.query(
    `UPDATE orders SET status='expired', updated_at=NOW()
     WHERE status='locked' AND lock_expires_at <= NOW()
     RETURNING *`
  );
  return rows;
}

async function findByUser(userId) {
  const { rows } = await db.query(
    `SELECT * FROM orders WHERE user_id=$1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

async function findById(id) {
  const { rows: [order] } = await db.query(
    'SELECT * FROM orders WHERE id=$1', [id]
  );
  return order || null;
}

async function findActiveForUser(userId, eventId) {
  const { rows } = await db.query(
    `SELECT id FROM orders WHERE user_id=$1 AND event_id=$2 AND status='locked' AND lock_expires_at > NOW()`,
    [userId, eventId]
  );
  return rows;
}

async function create(client, { userId, eventId, seatCategoryId, eventName, seatCategoryName, price, expiresAt }) {
  const { rows: [order] } = await client.query(
    `INSERT INTO orders
       (user_id, event_id, seat_category_id, event_name, seat_category_name, price, status, lock_expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'locked', $7)
     RETURNING *`,
    [userId, eventId, seatCategoryId, eventName, seatCategoryName, price, expiresAt]
  );
  return order;
}

async function confirm(client, orderId) {
  const { rows: [order] } = await client.query(
    `SELECT * FROM orders WHERE id=$1 AND status='locked' AND lock_expires_at > NOW() FOR UPDATE`,
    [orderId]
  );
  if (!order) return null;
  await client.query(
    "UPDATE orders SET status='confirmed', updated_at=NOW() WHERE id=$1",
    [orderId]
  );
  return order;
}

async function cancel(client, orderId) {
  const { rows: [order] } = await client.query(
    "SELECT * FROM orders WHERE id=$1 AND status='locked' FOR UPDATE",
    [orderId]
  );
  if (!order) return null;
  await client.query(
    "UPDATE orders SET status='cancelled', updated_at=NOW() WHERE id=$1",
    [orderId]
  );
  return order;
}

async function createTicket(client, { orderId, userId, eventName, seatCategory, seatNumber, qrCode }) {
  const { rows: [ticket] } = await client.query(
    `INSERT INTO tickets (order_id, user_id, event_name, seat_category, seat_number, qr_code)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [orderId, userId, eventName, seatCategory, seatNumber, qrCode]
  );
  return ticket;
}

async function findTicketById(id) {
  const { rows: [ticket] } = await db.query('SELECT * FROM tickets WHERE id=$1', [id]);
  return ticket || null;
}

module.exports = {
  findExpiredPending, findByUser, findById, findActiveForUser,
  create, confirm, cancel, createTicket, findTicketById,
};
