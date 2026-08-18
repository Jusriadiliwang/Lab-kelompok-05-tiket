/**
 * erp-service — modules/seat/seat.controller.js
 * M2: Manajemen Kursi & Inventory
 * - Dashboard status kursi real-time
 * - Hold kursi manual (sponsor / tamu VIP)
 * Hak akses: event-manager, super-admin
 */
const express  = require('express');
const router   = express.Router();
const snapshotRepo = require('../snapshot/snapshot.repository');
const auditRepo    = require('../audit/audit.repository');
const { authMiddleware, requireRole } = require('../auth/auth.middleware');

// GET /erp/events/:eventId/seats — dashboard status kursi
router.get('/erp/events/:eventId/seats', authMiddleware, async (req, res) => {
  try {
    const event = await snapshotRepo.findEventById(req.params.eventId);
    if (!event) return res.status(404).json({ error: 'not_found', message: 'Event tidak ditemukan' });

    const seats = await snapshotRepo.findSeatsByEvent(event.id);

    // Agregasi summary
    const summary = {
      total:     seats.reduce((s, c) => s + (c.total_seats    || 0), 0),
      available: seats.reduce((s, c) => s + (c.available_seats|| 0), 0),
      locked:    seats.reduce((s, c) => s + (c.locked_seats   || 0), 0),
      sold:      seats.reduce((s, c) => s + (c.sold_seats     || 0), 0),
      held:      seats.reduce((s, c) => s + (c.held_seats     || 0), 0),
    };

    res.json({ event_id: req.params.eventId, event_name: event.name, summary, categories: seats });
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// POST /erp/events/:eventId/seats/hold — hold kursi manual
router.post('/erp/events/:eventId/seats/hold',
  authMiddleware,
  requireRole('event-manager', 'super-admin'),
  async (req, res) => {
    const { seat_category_id, count = 1, reason } = req.body;
    if (!seat_category_id || count < 1) {
      return res.status(400).json({ error: 'bad_request', message: 'seat_category_id dan count wajib' });
    }
    try {
      const event = await snapshotRepo.findEventById(req.params.eventId);
      if (!event) return res.status(404).json({ error: 'not_found' });

      const result = await snapshotRepo.holdSeats(event.id, seat_category_id, parseInt(count));
      if (!result) return res.status(404).json({ error: 'not_found', message: 'Kategori kursi tidak ditemukan' });

      await auditRepo.log({
        adminId: req.admin.adminId, action: 'HOLD_SEAT', entityType: 'SEAT',
        entityId: seat_category_id,
        afterState: { count, reason: reason || null, event_id: req.params.eventId },
        ipAddress: req.ip,
      });

      res.json({ message: `${count} kursi berhasil di-hold`, category: result });
    } catch (err) {
      res.status(500).json({ error: 'internal_error', message: err.message });
    }
  }
);

// POST /erp/events/:eventId/seats/upload — upload seat categories via CSV/JSON
// Format CSV: name,price,total_seats (satu baris per kategori)
// Format JSON: [{ name, price, total_seats }]
router.post('/erp/events/:eventId/seats/upload',
  authMiddleware,
  requireRole('event-manager', 'super-admin'),
  async (req, res) => {
    const { categories, csv } = req.body;

    // Parse CSV jika dikirim sebagai string
    let cats = categories;
    if (!cats && csv) {
      try {
        cats = csv.trim().split('\n')
          .filter(line => line.trim() && !line.startsWith('#'))
          .map(line => {
            const [name, price, total_seats] = line.split(',').map(s => s.trim());
            return { name, price: parseFloat(price), total_seats: parseInt(total_seats) };
          })
          .filter(c => c.name && !isNaN(c.price) && !isNaN(c.total_seats));
      } catch (e) {
        return res.status(400).json({ error: 'bad_request', message: 'Format CSV tidak valid. Gunakan: name,price,total_seats' });
      }
    }

    if (!cats || !cats.length) {
      return res.status(400).json({
        error: 'bad_request',
        message: 'Kirim "categories" (array) atau "csv" (string format: name,price,total_seats per baris)',
      });
    }

    // Validasi semua kategori
    const invalid = cats.filter(c => !c.name || isNaN(c.price) || isNaN(c.total_seats));
    if (invalid.length) {
      return res.status(400).json({ error: 'bad_request', message: `${invalid.length} kategori tidak valid`, invalid });
    }

    try {
      const event = await snapshotRepo.findEventById(req.params.eventId);
      if (!event) return res.status(404).json({ error: 'not_found', message: 'Event tidak ditemukan' });

      // Push ke event-service
      const fetch = require('node-fetch');
      const EVENT_SERVICE_URL = process.env.EVENT_SERVICE_URL || 'http://localhost:3001';
      const upstream = await fetch(`${EVENT_SERVICE_URL}/events/${req.params.eventId}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: cats }),
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);

      // Sync snapshot lokal (terlepas dari event-service response)
      const synced = [];
      for (const cat of cats) {
        const s = await snapshotRepo.upsertSeatSnapshot(event.id, {
          id: Date.now() + Math.random(),
          name: cat.name, price: cat.price,
          total_seats: cat.total_seats, available_seats: cat.total_seats,
        }).catch(() => null);
        if (s) synced.push(s);
      }

      await auditRepo.log({
        adminId: req.admin.adminId, action: 'CREATE', entityType: 'SEAT',
        entityId: req.params.eventId,
        afterState: { categories: cats.length, event_id: req.params.eventId },
        ipAddress: req.ip,
      });

      res.status(201).json({
        message: `${synced.length} kategori kursi berhasil diupload`,
        synced,
        event_service_synced: upstream?.ok || false,
      });
    } catch (err) {
      res.status(500).json({ error: 'internal_error', message: err.message });
    }
  }
);

module.exports = router;
