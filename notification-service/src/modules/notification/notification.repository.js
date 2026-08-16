/**
 * notification-service — modules/notification/notification.repository.js
 * Query layer untuk tabel notifications
 */
const db = require('../../database');

async function save({ userId, type, title, message }) {
  try {
    const { rows: [notif] } = await db.query(
      `INSERT INTO notifications (user_id, type, title, message) VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, type, title, message]
    );
    return notif;
  } catch (err) {
    console.error('[notification.repository] Gagal simpan notifikasi:', err.message);
    return null;
  }
}

async function findFailed(limit = 50) {
  const { rows } = await db.query(
    `SELECT * FROM notifications WHERE status='failed' ORDER BY created_at ASC LIMIT $1`,
    [limit]
  );
  return rows;
}

async function markSent(id) {
  await db.query(
    `UPDATE notifications SET status='sent', updated_at=NOW() WHERE id=$1`,
    [id]
  );
}

async function markFailed(id) {
  await db.query(
    `UPDATE notifications SET status='failed', retry_count=COALESCE(retry_count,0)+1, updated_at=NOW() WHERE id=$1`,
    [id]
  );
}

module.exports = { save, findFailed, markSent, markFailed };
