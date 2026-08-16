/**
 * event-service — modules/event/event.controller.js
 * HTTP handler untuk resource Event
 */
const express = require('express');
const router = express.Router();
const eventService = require('./event.service');

// GET / — info service
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
    ],
  });
});

// GET /catalog
router.get('/catalog', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const { data, total } = await eventService.getCatalog(page, limit);
    res.json({
      data,
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[GET /catalog]', err.message);
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// GET /events
router.get('/events', async (req, res) => {
  try {
    const data = await eventService.getAllEvents();
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// GET /events/:id
router.get('/events/:id', async (req, res) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    if (!event) return res.status(404).json({ error: 'not_found', message: 'Konser tidak ditemukan' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// GET /events/:id/seats
router.get('/events/:id/seats', async (req, res) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    if (!event) return res.status(404).json({ error: 'not_found', message: 'Konser tidak ditemukan' });
    res.json({ event_id: event.id, event_name: event.name, categories: event.categories });
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// POST /events
router.post('/events', async (req, res) => {
  const { name, venue, event_date, description, banner_url, categories } = req.body;
  if (!name || !venue || !event_date) {
    return res.status(400).json({ error: 'bad_request', message: 'name, venue, event_date wajib diisi' });
  }
  try {
    const event = await eventService.createEvent({ name, venue, event_date, description, banner_url, categories });
    res.status(201).json(event);
  } catch (err) {
    console.error('[POST /events]', err.message);
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// PUT /events/:id/status
router.put('/events/:id/status', async (req, res) => {
  const { status } = req.body;
  const valid = ['upcoming', 'on_sale', 'sold_out', 'completed', 'cancelled'];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: 'bad_request', message: `Status harus salah satu dari: ${valid.join(', ')}` });
  }
  try {
    const event = await eventService.updateStatus(req.params.id, status);
    if (!event) return res.status(404).json({ error: 'not_found', message: 'Konser tidak ditemukan' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

module.exports = router;
