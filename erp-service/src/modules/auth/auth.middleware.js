/**
 * erp-service — modules/auth/auth.middleware.js
 * M5: Verifikasi JWT admin + RBAC role guard
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'erp_wartiket_secret_kelompok5_2024';

// Hak akses per role
const ROLE_PERMISSIONS = {
  'super-admin':   ['*'],
  'event-manager': ['events:read','events:write','seats:read','seats:write'],
  'finance':       ['revenue:read','revenue:export','payments:refund'],
  'analyst':       ['analytics:read','revenue:read','events:read','seats:read'],
  'support':       ['orders:read','payments:refund'],
};

function hasPermission(role, permission) {
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes('*') || perms.includes(permission);
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized', message: 'Token admin tidak ditemukan' });
  }
  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, JWT_SECRET);
    req.admin = payload;
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token kedaluwarsa' : 'Token tidak valid';
    return res.status(401).json({ error: 'unauthorized', message: msg });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.admin) return res.status(401).json({ error: 'unauthorized' });
    if (allowedRoles.includes('*') || allowedRoles.includes(req.admin.role) || req.admin.role === 'super-admin') {
      return next();
    }
    return res.status(403).json({
      error: 'forbidden',
      message: `Role '${req.admin.role}' tidak memiliki akses ke resource ini`,
    });
  };
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.admin) return res.status(401).json({ error: 'unauthorized' });
    if (hasPermission(req.admin.role, permission)) return next();
    return res.status(403).json({
      error: 'forbidden',
      message: `Tidak ada izin '${permission}'`,
    });
  };
}

module.exports = { authMiddleware, requireRole, requirePermission };
