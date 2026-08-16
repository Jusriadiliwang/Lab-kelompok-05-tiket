/**
 * event-service — modules/seat-category/seat-category.controller.js
 * HTTP handler internal untuk decrement/increment seat_categories
 * (dipanggil oleh ticket-service)
 */
const express = require('express');
const router = express.Router();
const db = require('../../database');
const seatCategoryRepo = require('./seat-category.repository');

// PATCH /events/:id/seats/decrement — kurangi available_seats
router.patch('/events/:id/seats/decrement', async (req, res) => {
  const { seat_category_id } = req.body;
  if (!seat_category_id) {
    return res.status(400).json({ error: 'bad_request', message: 'seat_category_id wajib' });
  }
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await seatCategoryRepo.decrement(client, req.params.id, seat_category_id);
    if (!result) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'not_found', message: 'Kategori kursi tidak ditemukan' });
    }
    if (result.soldOut) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'sold_out', message: 'Kursi habis' });
    }
    await client.query('COMMIT');
    res.json(result);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'internal_error', message: err.message });
  } finally {
    client.release();
  }
});

// PATCH /events/:id/seats/increment — kembalikan kursi saat order dibatalkan
router.patch('/events/:id/seats/increment', async (req, res) => {
  const { seat_category_id } = req.body;
  try {
    const updated = await seatCategoryRepo.increment(req.params.id, seat_category_id);
    if (!updated) return res.status(404).json({ error: 'not_found', message: 'Kategori kursi tidak ditemukan' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

module.exports = router;
