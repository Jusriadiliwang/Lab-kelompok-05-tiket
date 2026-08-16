/**
 * erp-service — modules/audit/audit.repository.js
 * M6: Audit Trail — append-only, tidak ada UPDATE/DELETE
 */
const db = require('../../database');

async function log({ adminId, action, entityType, entityId, beforeState, afterState, ipAddress }) {
  try {
    await db.query(
      `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, before_state, after_state, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        adminId || null,
        action,
        entityType,
        entityId ? String(entityId) : null,
        beforeState ? JSON.stringify(beforeState) : null,
        afterState  ? JSON.stringify(afterState)  : null,
        ipAddress   || null,
      ]
    );
  } catch (err) {
    // Audit log gagal tidak boleh menghentikan operasi utama
    console.error('[audit] Gagal catat audit log:', err.message);
  }
}

async function findAll({ entityType, action, adminId, limit = 100, offset = 0 }) {
  let query = `SELECT al.*, au.name AS admin_name, au.email AS admin_email
               FROM audit_logs al
               LEFT JOIN admin_users au ON al.admin_id = au.id
               WHERE 1=1`;
  const params = [];
  if (entityType) { params.push(entityType); query += ` AND al.entity_type=$${params.length}`; }
  if (action)     { params.push(action);     query += ` AND al.action=$${params.length}`; }
  if (adminId)    { params.push(adminId);    query += ` AND al.admin_id=$${params.length}`; }
  params.push(limit, offset);
  query += ` ORDER BY al.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

  const { rows } = await db.query(query, params);
  return rows;
}

module.exports = { log, findAll };
