/**
 * payment-service — consumers/ticket-locked.consumer.js
 * Consume event ticket.locked → catat audit log bahwa kursi sedang dipesan
 * (payment dimulai oleh user via POST /payments, bukan di sini)
 */
const db = require('../database');

async function handle(data) {
  try {
    await db.query(
      `INSERT INTO payment_audit_log (event_type, order_id, user_id, event_id, payload, created_at)
       VALUES ('ticket.locked', $1, $2, $3, $4, NOW())`,
      [data.order_id, data.user_id, data.event_id, JSON.stringify(data)]
    );
    console.log(`[ticket-locked.consumer] Audit log: order ${data.order_id} terkunci`);
  } catch (err) {
    console.error('[ticket-locked.consumer] Error:', err.message);
  }
}

module.exports = { handle };
