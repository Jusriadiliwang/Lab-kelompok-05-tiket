/**
 * payment-service — modules/order/order.repository.js
 * Query layer untuk tabel payments
 */
const db = require('../../database');

async function findById(id) {
  const { rows: [payment] } = await db.query('SELECT * FROM payments WHERE id=$1', [id]);
  return payment || null;
}

async function findByOrderAndStatus(orderId, statuses) {
  const placeholders = statuses.map((_, i) => `$${i + 2}`).join(',');
  const { rows } = await db.query(
    `SELECT id, status FROM payments WHERE order_id=$1 AND status IN (${placeholders})`,
    [orderId, ...statuses]
  );
  return rows;
}

async function findByFilter({ orderId, userId }) {
  let query = 'SELECT * FROM payments WHERE 1=1';
  const params = [];
  if (orderId) { params.push(orderId); query += ` AND order_id=$${params.length}`; }
  if (userId)  { params.push(userId);  query += ` AND user_id=$${params.length}`; }
  query += ' ORDER BY created_at DESC LIMIT 100';
  const { rows } = await db.query(query, params);
  return rows;
}

async function findExpiredPending() {
  const { rows } = await db.query(
    `SELECT * FROM payments WHERE status='pending'
     AND created_at <= NOW() - INTERVAL '15 minutes'`
  );
  return rows;
}

async function create(client, { orderId, userId, amount, method }) {
  const { rows: [payment] } = await client.query(
    `INSERT INTO payments (order_id, user_id, amount, method, status)
     VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
    [orderId, userId, amount, method]
  );
  return payment;
}

async function updateStatus(client, id, status) {
  const extraFields = status === 'success' ? ', paid_at=NOW()' : '';
  const { rows: [payment] } = await client.query(
    `UPDATE payments SET status=$1, updated_at=NOW()${extraFields} WHERE id=$2 RETURNING *`,
    [status, id]
  );
  return payment;
}

async function markRefunded(id) {
  const { rows: [payment] } = await db.query(
    `UPDATE payments SET status='refunded', updated_at=NOW()
     WHERE id=$1 AND status='success' RETURNING *`,
    [id]
  );
  return payment || null;
}

async function markFailed(id) {
  const { rows: [payment] } = await db.query(
    `UPDATE payments SET status='failed', updated_at=NOW() WHERE id=$1 RETURNING *`,
    [id]
  );
  return payment || null;
}

module.exports = { findById, findByOrderAndStatus, findByFilter, findExpiredPending, create, updateStatus, markRefunded, markFailed };
