/**
 * erp-service — modules/event/event.controller.js
 * M1: Manajemen Event — CRUD via REST ke event-service
 * Hak akses: event-manager, super-admin
 */
const express  = require('express');
const router   = express.Router();
const fetch    = require('node-fetch');
const snapshotRepo = require('../snapshot/snapshot.repository');
const auditRepo    = require('../audit/audit.repository');
const { authMiddleware, requireRole } = require('../auth/auth.middleware');

const EVENT_SERVICE_URL = process.env.EVENT_SERVICE_URL || 'http://localhost:3001';

// GET /erp/events — list event dari snapshot lokal
router.get('/erp/events', authMiddleware, async (req, res) => {
  try {
    const { status, limit = 20, page = 1 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const events = await snapshotRepo.findAllEvents({ status, limit: parseInt(limit), offset });
    res.json({ data: events });
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// GET /erp/events/:id — detail event
router.get('/erp/events/:id', authMiddleware, async (req, res) => {
  try {
    const event = await snapshotRepo.findEventById(req.params.id);
    if (!event) return res.status(404).json({ error: 'not_found', message: 'Event tidak ditemukan di snapshot ERP' });
    const seats = await snapshotRepo.findSeatsByEvent(event.id);
    res.json({ ...event, seat_categories: seats });
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// POST /erp/events — buat event baru via event-service
router.post('/erp/events',
  authMiddleware,
  requireRole('event-manager', 'super-admin'),
  async (req, res) => {
    const { name, venue, event_date, description, banner_url, categories = [] } = req.body;
    if (!name || !venue || !event_date) {
      return res.status(400).json({ error: 'bad_request', message: 'name, venue, event_date wajib' });
    }
    try {
      const upstream = await fetch(`${EVENT_SERVICE_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, venue, event_date, description, banner_url, categories }),
      });
      const data = await upstream.json();
      if (!upstream.ok) return res.status(upstream.status).json(data);

      // Sync snapshot lokal
      await snapshotRepo.upsertEventSnapshot(data);

      await auditRepo.log({
        adminId: req.admin.adminId, action: 'CREATE', entityType: 'EVENT',
        entityId: data.id, afterState: { name, venue, event_date }, ipAddress: req.ip,
      });
      res.status(201).json(data);
    } catch (err) {
      res.status(502).json({ error: 'bad_gateway', message: err.message });
    }
  }
);

// PUT /erp/events/:id/status — publish / cancel event
router.put('/erp/events/:id/status',
  authMiddleware,
  requireRole('event-manager', 'super-admin'),
  async (req, res) => {
    const { status } = req.body;
    const valid = ['upcoming','on_sale','sold_out','completed','cancelled'];
    if (!valid.includes(status)) {
      return res.status(400).json({ error: 'bad_request', message: `Status harus: ${valid.join(', ')}` });
    }
    try {
      const before = await snapshotRepo.findEventById(req.params.id);

      const upstream = await fetch(`${EVENT_SERVICE_URL}/events/${req.params.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await upstream.json();
      if (!upstream.ok) return res.status(upstream.status).json(data);

      // Update snapshot lokal
      await snapshotRepo.upsertEventSnapshot(data);

      await auditRepo.log({
        adminId: req.admin.adminId, action: 'UPDATE', entityType: 'EVENT',
        entityId: req.params.id,
        beforeState: before ? { status: before.status } : null,
        afterState: { status }, ipAddress: req.ip,
      });
      res.json(data);
    } catch (err) {
      res.status(502).json({ error: 'bad_gateway', message: err.message });
    }
  }
);

module.exports = router;
