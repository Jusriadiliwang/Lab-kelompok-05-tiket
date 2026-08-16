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

module.exports = router;
