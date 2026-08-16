/**
 * api-gateway — middleware/auth.middleware.js
 * Verifikasi JWT token, inject userId & role ke header downstream
 *
 * Public routes (tidak butuh auth):
 *   GET  /catalog
 *   GET  /events
 *   GET  /events/:id
 *   GET  /events/:id/seats
 *   GET  /health
 *   POST /auth/login   (jika ada)
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'wartiket_secret_kelompok5_2024';

// Route yang tidak perlu token
const PUBLIC_ROUTES = [
  { method: 'GET',  pattern: /^\/$/ },
  { method: 'GET',  pattern: /^\/health$/ },
  { method: 'GET',  pattern: /^\/catalog/ },
  { method: 'GET',  pattern: /^\/events/ },
];

function isPublic(method, path) {
  return PUBLIC_ROUTES.some(r => r.method === method && r.pattern.test(path));
}

function authMiddleware(req, res, next) {
  if (isPublic(req.method, req.path)) return next();

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Token tidak ditemukan. Sertakan Authorization: Bearer <token>',
      correlationId: req.correlationId,
    });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Inject ke header agar service downstream bisa baca tanpa verifikasi ulang
    req.headers['x-user-id']   = String(payload.userId || payload.sub || '');
    req.headers['x-user-role'] = String(payload.role || 'user');
    req.userId = req.headers['x-user-id'];
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token sudah kedaluwarsa' : 'Token tidak valid';
    return res.status(401).json({
      error: 'unauthorized',
      message: msg,
      correlationId: req.correlationId,
    });
  }
}

/**
 * Buat JWT token (dipakai untuk testing / endpoint /auth/token)
 */
function signToken(payload, expiresIn = '24h') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

module.exports = { authMiddleware, signToken };
