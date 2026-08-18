/**
 * erp-service — modules/revenue/revenue.controller.js
 * M3: Keuangan & Revenue
 * - Rekap pendapatan per event / periode
 * - Export CSV
 * - Trigger refund manual
 */
const express = require('express');
const router  = express.Router();
const fetch   = require('node-fetch');
const revenueRepo = require('./revenue.repository');
const auditRepo   = require('../audit/audit.repository');
const { authMiddleware, requireRole } = require('../auth/auth.middleware');

const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3003';

// GET /erp/revenue — rekap pendapatan
router.get('/erp/revenue',
  authMiddleware,
  requireRole('finance', 'analyst', 'super-admin'),
  async (req, res) => {
    const { event_id, start_date, end_date, limit = 100, page = 1 } = req.query;
    try {
      const rows = await revenueRepo.findReports({
        eventId: event_id, startDate: start_date, endDate: end_date,
        limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit),
      });
      res.json({ data: rows });
    } catch (err) {
      res.status(500).json({ error: 'internal_error', message: err.message });
    }
  }
);

// GET /erp/revenue/:eventId/summary — rekap total satu event
router.get('/erp/revenue/:eventId/summary',
  authMiddleware,
  requireRole('finance', 'analyst', 'super-admin'),
  async (req, res) => {
    try {
      const summary = await revenueRepo.getSummary(req.params.eventId);
      res.json(summary);
    } catch (err) {
      res.status(500).json({ error: 'internal_error', message: err.message });
    }
  }
);

// GET /erp/revenue/export — export CSV
router.get('/erp/revenue/export',
  authMiddleware,
  requireRole('finance', 'super-admin'),
  async (req, res) => {
    const { event_id, start_date, end_date } = req.query;
    try {
      const rows = await revenueRepo.findReports({ eventId: event_id, startDate: start_date, endDate: end_date, limit: 10000 });

      const header = 'event_id,event_name,report_date,tickets_sold,tickets_expired,gross_revenue,refunded_amount,net_revenue\n';
      const csv = rows.map(r =>
        `${r.source_event_id},"${r.event_name || ''}",${r.report_date},${r.tickets_sold},${r.tickets_expired},${r.gross_revenue},${r.refunded_amount},${r.net_revenue}`
      ).join('\n');

      await auditRepo.log({
        adminId: req.admin.adminId, action: 'EXPORT', entityType: 'REVENUE',
        afterState: { event_id, start_date, end_date, rows: rows.length }, ipAddress: req.ip,
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="revenue-${Date.now()}.csv"`);
      res.send(header + csv);
    } catch (err) {
      res.status(500).json({ error: 'internal_error', message: err.message });
    }
  }
);

// POST /erp/payments/:paymentId/refund — proses refund manual
router.post('/erp/payments/:paymentId/refund',
  authMiddleware,
  requireRole('finance', 'super-admin', 'support'),
  async (req, res) => {
    try {
      const upstream = await fetch(`${PAYMENT_SERVICE_URL}/payments/${req.params.paymentId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await upstream.json();
      if (!upstream.ok) return res.status(upstream.status).json(data);

      await auditRepo.log({
        adminId: req.admin.adminId, action: 'REFUND', entityType: 'PAYMENT',
        entityId: req.params.paymentId, afterState: data, ipAddress: req.ip,
      });
      res.json(data);
    } catch (err) {
      res.status(502).json({ error: 'bad_gateway', message: err.message });
    }
  }
);

// GET /erp/payments — daftar semua payment dengan filter status
router.get('/erp/payments',
  authMiddleware,
  requireRole('finance', 'super-admin', 'support'),
  async (req, res) => {
    const { status, order_id, user_id, limit = 100, page = 1 } = req.query;
    try {
      const qs = new URLSearchParams();
      if (order_id) qs.set('order_id', order_id);
      if (user_id)  qs.set('user_id', user_id);
      const url = `${PAYMENT_SERVICE_URL}/payments?${qs.toString()}`;
      const upstream = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!upstream.ok) return res.status(upstream.status).json(await upstream.json());
      const data = await upstream.json();
      // Filter by status jika ada
      let rows = data.data || [];
      if (status) rows = rows.filter(p => p.status === status);
      res.json({ data: rows, total: rows.length });
    } catch (err) {
      res.status(502).json({ error: 'bad_gateway', message: err.message });
    }
  }
);

module.exports = router;
