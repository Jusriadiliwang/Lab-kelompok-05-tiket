/**
 * erp-service — modules/audit/audit.controller.js
 * M6: Audit Trail — read-only, immutable log
 */
const express = require('express');
const router  = express.Router();
const auditRepo = require('./audit.repository');
const { authMiddleware, requireRole } = require('../auth/auth.middleware');

// GET /erp/audit — baca semua audit log
router.get('/erp/audit',
  authMiddleware,
  requireRole('super-admin', 'finance'),
  async (req, res) => {
    const { entity_type, action, admin_id, limit = 100, page = 1 } = req.query;
    try {
      const rows = await auditRepo.findAll({
        entityType: entity_type, action, adminId: admin_id,
        limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit),
      });
      res.json({ data: rows });
    } catch (err) {
      res.status(500).json({ error: 'internal_error', message: err.message });
    }
  }
);

// GET /erp/audit/export — export audit log CSV
router.get('/erp/audit/export',
  authMiddleware,
  requireRole('super-admin'),
  async (req, res) => {
    try {
      const rows = await auditRepo.findAll({ limit: 50000 });
      const header = 'id,admin_id,admin_name,action,entity_type,entity_id,ip_address,created_at\n';
      const csv = rows.map(r =>
        `${r.id},${r.admin_id || ''},"${r.admin_name || ''}",${r.action},${r.entity_type},${r.entity_id || ''},${r.ip_address || ''},${r.created_at}`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-log-${Date.now()}.csv"`);
      res.send(header + csv);
    } catch (err) {
      res.status(500).json({ error: 'internal_error', message: err.message });
    }
  }
);

module.exports = router;
