/**
 * erp-service — modules/analytics/analytics.controller.js
 * M4: Pelaporan & Analitik
 * - Dashboard penjualan live
 * - Conversion rate (lock → bayar → konfirmasi)
 * - Drop-off analysis
 */
const express = require('express');
const router  = express.Router();
const db      = require('../../database');
const snapshotRepo = require('../snapshot/snapshot.repository');
const { authMiddleware, requireRole } = require('../auth/auth.middleware');

// GET /erp/analytics/dashboard — ringkasan semua event
router.get('/erp/analytics/dashboard',
  authMiddleware,
  requireRole('analyst', 'finance', 'super-admin', 'event-manager'),
  async (req, res) => {
    try {
      // Revenue aggregasi dari semua report
      const { rows: [revenue] } = await db.query(
        `SELECT
           SUM(tickets_sold)    AS total_sold,
           SUM(tickets_expired) AS total_expired,
           SUM(gross_revenue)   AS total_gross,
           SUM(net_revenue)     AS total_net
         FROM revenue_reports`
      );

      // Status event
      const { rows: eventStats } = await db.query(
        `SELECT status, COUNT(*) AS count FROM erp_event_snapshots GROUP BY status`
      );

      // Seat summary global
      const { rows: [seatStats] } = await db.query(
        `SELECT
           SUM(total_seats)    AS total,
           SUM(available_seats) AS available,
           SUM(sold_seats)     AS sold,
           SUM(locked_seats)   AS locked,
           SUM(held_seats)     AS held
         FROM erp_seat_snapshots`
      );

      res.json({
        revenue,
        event_stats: eventStats,
        seat_stats: seatStats,
        generated_at: new Date(),
      });
    } catch (err) {
      res.status(500).json({ error: 'internal_error', message: err.message });
    }
  }
);

// GET /erp/analytics/conversion — conversion rate per event
router.get('/erp/analytics/conversion',
  authMiddleware,
  requireRole('analyst', 'super-admin'),
  async (req, res) => {
    try {
      const { rows } = await db.query(
        `SELECT
           r.source_event_id,
           e.name AS event_name,
           r.tickets_sold,
           r.tickets_locked,
           r.tickets_expired,
           r.gross_revenue,
           CASE WHEN (r.tickets_sold + r.tickets_locked + r.tickets_expired) > 0
             THEN ROUND(r.tickets_sold::numeric /
               (r.tickets_sold + r.tickets_locked + r.tickets_expired) * 100, 2)
             ELSE 0
           END AS conversion_rate_pct,
           CASE WHEN (r.tickets_sold + r.tickets_expired) > 0
             THEN ROUND(r.tickets_expired::numeric /
               (r.tickets_sold + r.tickets_expired) * 100, 2)
             ELSE 0
           END AS dropoff_rate_pct
         FROM revenue_reports r
         LEFT JOIN erp_event_snapshots e ON r.source_event_id = e.source_event_id
         ORDER BY r.report_date DESC
         LIMIT 50`
      );
      res.json({ data: rows });
    } catch (err) {
      res.status(500).json({ error: 'internal_error', message: err.message });
    }
  }
);

module.exports = router;
