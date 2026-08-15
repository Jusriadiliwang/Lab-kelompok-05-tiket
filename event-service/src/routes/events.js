/**
 * event-service — routes/events.js
 * Kelola konser, jadwal, kategori kursi, dan harga
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
    service: 'event-service',
    version: '1.0.0',
    status: 'running',
    endpoints: [
      'GET  /catalog',
      'GET  /events',
      'GET  /events/:id',
      'GET  /events/:id/seats',
      'POST /events',
      'PUT  /events/:id/status',
      'PATCH /events/:id/seats/decrement',
      'PATCH /events/:id/seats/increment',
      'GET  /health',
    ],
  });
});

// ─────────────────────────────────────────────────────────────
// GET /catalog  — ENDPOINT KRITIS #1
// Daftar konser aktif + kursi tersedia (yang paling sering diakses)
// ─────────────────────────────────────────────────────────────
router.get('/catalog', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    const { rows: events } = await db.query(
      `SELECT e.*, 
              json_agg(
                json_build_object(
                  'id', sc.id,
                  'name', sc.name,
                  'total_seats', sc.total_seats,
                  'available_seats', sc.available_seats,
                  'price', sc.price
                ) ORDER BY sc.price
              ) AS categories
       FROM events e
       JOIN seat_categories sc ON sc.event_id = e.id
       WHERE e.status IN ('on_sale', 'upcoming')
         AND sc.available_seats > 0
       GROUP BY e.id
       ORDER BY e.event_date ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const { rows: [{count}] } = await db.query(
      `SELECT COUNT(DISTINCT e.id) FROM events e
       JOIN seat_categories sc ON sc.event_id = e.id
       WHERE e.status IN ('on_sale','upcoming') AND sc.available_seats > 0`
    );

    res.json({
      data: events,
      pagination: {
        page,
        limit,
        total: parseInt(count),
        total_pages: Math.ceil(count / limit)
      }
    });
  } catch (err) {
    console.error('[GET /catalog]', err.message);
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// GET /events — semua konser
router.get('/events', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM events ORDER BY event_date ASC'
    );
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// GET /events/:id — detail satu konser
router.get('/events/:id', async (req, res) => {
  try {
    const { rows: [event] } = await db.query(
      'SELECT * FROM events WHERE id = $1', [req.params.id]
    );
    if (!event) return res.status(404).json({ error: 'not_found', message: 'Konser tidak ditemukan' });

    const { rows: categories } = await db.query(
      'SELECT * FROM seat_categories WHERE event_id = $1 ORDER BY price', [req.params.id]
    );
    res.json({ ...event, categories });
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// GET /events/:id/seats — kursi tersedia
router.get('/events/:id/seats', async (req, res) => {
  try {
    const { rows: [event] } = await db.query(
      'SELECT id, name FROM events WHERE id = $1', [req.params.id]
    );
    if (!event) return res.status(404).json({ error: 'not_found', message: 'Konser tidak ditemukan' });

    const { rows: categories } = await db.query(
      'SELECT * FROM seat_categories WHERE event_id = $1 ORDER BY price', [req.params.id]
    );
    res.json({ event_id: event.id, event_name: event.name, categories });
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// POST /events — buat konser baru (admin)
router.post('/events', async (req, res) => {
  const client = await db.connect();
  try {
    const { name, venue, event_date, description, banner_url, categories = [] } = req.body;
    if (!name || !venue || !event_date) {
      return res.status(400).json({ error: 'bad_request', message: 'name, venue, event_date wajib diisi' });
    }

    await client.query('BEGIN');

    const { rows: [event] } = await client.query(
      `INSERT INTO events (name, venue, event_date, description, banner_url, status)
       VALUES ($1, $2, $3, $4, $5, 'upcoming') RETURNING *`,
      [name, venue, event_date, description, banner_url]
    );

    const cats = [];
    for (const cat of categories) {
      const { rows: [c] } = await client.query(
        `INSERT INTO seat_categories (event_id, name, total_seats, available_seats, price)
         VALUES ($1, $2, $3, $3, $4) RETURNING *`,
        [event.id, cat.name, cat.total_seats, cat.price]
      );
      cats.push(c);
    }

    await client.query('COMMIT');
    res.status(201).json({ ...event, categories: cats });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[POST /events]', err.message);
    res.status(500).json({ error: 'internal_error', message: err.message });
  } finally {
    client.release();
  }
});

// PUT /events/:id/status — ubah status konser
router.put('/events/:id/status', async (req, res) => {
  const { status } = req.body;
  const valid = ['upcoming','on_sale','sold_out','completed','cancelled'];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: 'bad_request', message: `Status harus salah satu dari: ${valid.join(', ')}` });
  }
  try {
    const { rows: [event] } = await db.query(
      'UPDATE events SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );
    if (!event) return res.status(404).json({ error: 'not_found', message: 'Konser tidak ditemukan' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// PATCH /events/:id/seats/decrement — internal: kurangi available_seats (dipanggil ticket-service)
router.patch('/events/:id/seats/decrement', async (req, res) => {
  const { seat_category_id } = req.body;
  if (!seat_category_id) {
    return res.status(400).json({ error: 'bad_request', message: 'seat_category_id wajib' });
  }
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { rows: [cat] } = await client.query(
      `SELECT * FROM seat_categories WHERE id=$1 AND event_id=$2 FOR UPDATE`,
      [seat_category_id, req.params.id]
    );
    if (!cat) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'not_found', message: 'Kategori kursi tidak ditemukan' });
    }
    if (cat.available_seats <= 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'sold_out', message: 'Kursi habis' });
    }
    const { rows: [updated] } = await client.query(
      `UPDATE seat_categories SET available_seats = available_seats - 1, updated_at=NOW()
       WHERE id=$1
       RETURNING *, (SELECT name FROM events WHERE id=event_id) AS event_name`,
      [seat_category_id]
    );
    await client.query('COMMIT');
    res.json(updated);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'internal_error', message: err.message });
  } finally {
    client.release();
  }
});

// PATCH /events/:id/seats/increment — internal: tambah kembali saat order dibatalkan
router.patch('/events/:id/seats/increment', async (req, res) => {
  const { seat_category_id } = req.body;
  try {
    const { rows: [updated] } = await db.query(
      `UPDATE seat_categories SET available_seats = available_seats + 1, updated_at=NOW()
       WHERE id=$1 AND event_id=$2 AND available_seats < total_seats RETURNING *`,
      [seat_category_id, req.params.id]
    );
    if (!updated) return res.status(404).json({ error: 'not_found', message: 'Kategori kursi tidak ditemukan' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

module.exports = router;
