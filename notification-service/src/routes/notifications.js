/**
 * notification-service — routes/notifications.js
 * REST endpoint untuk membaca notifikasi
 * Kelompok 5: Ashabul Kahfi (Backend/API Engineer)
 */
const express = require('express');
const router  = express.Router();
const db      = require('../db');

// ─────────────────────────────────────────────────────────────
// GET /  — Info service
// ─────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  res.json({
    service: 'notification-service',
    version: '1.0.0',
    status: 'running',
    endpoints: [
      'GET   /notifications?user_id=xxx',
      'PATCH /notifications/:id/read',
      'PATCH /notifications/read-all',
      'GET   /health',
    ],
  });
});

// GET /notifications?user_id=xxx
router.get('/notifications', async (req, res) => {
  const { user_id, limit = 20, unread_only } = req.query;
  if (!user_id) {
    return res.status(400).json({ error: 'bad_request', message: 'user_id wajib' });
  }

  try {
    let query = 'SELECT * FROM notifications WHERE user_id=$1';
    const params = [user_id];

    if (unread_only === 'true') {
      query += ' AND is_read=FALSE';
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(Math.min(100, parseInt(limit)));

    const { rows } = await db.query(query, params);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// PATCH /notifications/:id/read — tandai sudah dibaca
router.patch('/notifications/:id/read', async (req, res) => {
  try {
    const { rows: [notif] } = await db.query(
      'UPDATE notifications SET is_read=TRUE, updated_at=NOW() WHERE id=$1 RETURNING *',
      [req.params.id]
    );
    if (!notif) return res.status(404).json({ error: 'not_found', message: 'Notifikasi tidak ditemukan' });
    res.json(notif);
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// PATCH /notifications/read-all?user_id=xxx
router.patch('/notifications/read-all', async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'bad_request', message: 'user_id wajib' });

  try {
    const { rowCount } = await db.query(
      'UPDATE notifications SET is_read=TRUE, updated_at=NOW() WHERE user_id=$1 AND is_read=FALSE',
      [user_id]
    );
    res.json({ message: `${rowCount} notifikasi ditandai dibaca` });
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

module.exports = router;
