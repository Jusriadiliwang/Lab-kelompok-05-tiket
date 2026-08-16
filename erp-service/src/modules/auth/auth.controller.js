/**
 * erp-service — modules/auth/auth.controller.js
 * M5: Login admin, refresh token, info profil
 */
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../../database');
const auditRepo = require('../audit/audit.repository');
const { authMiddleware } = require('./auth.middleware');

const JWT_SECRET     = process.env.JWT_SECRET     || 'erp_wartiket_secret_kelompok5_2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

// POST /erp/auth/login
router.post('/erp/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'bad_request', message: 'email dan password wajib diisi' });
  }
  try {
    const { rows: [admin] } = await db.query(
      'SELECT * FROM admin_users WHERE email=$1 AND is_active=TRUE', [email]
    );
    if (!admin) {
      return res.status(401).json({ error: 'unauthorized', message: 'Email atau password salah' });
    }
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'unauthorized', message: 'Email atau password salah' });
    }
    const token = jwt.sign(
      { adminId: admin.id, email: admin.email, role: admin.role, name: admin.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    await auditRepo.log({
      adminId: admin.id, action: 'LOGIN', entityType: 'USER', entityId: admin.id,
      ipAddress: req.ip,
    });
    res.json({
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
      expiresIn: JWT_EXPIRES_IN,
    });
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// GET /erp/auth/me — profil admin yang login
router.get('/erp/auth/me', authMiddleware, async (req, res) => {
  try {
    const { rows: [admin] } = await db.query(
      'SELECT id, name, email, role, created_at FROM admin_users WHERE id=$1', [req.admin.adminId]
    );
    if (!admin) return res.status(404).json({ error: 'not_found' });
    res.json(admin);
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// GET /erp/admin/users — list semua admin (super-admin only)
router.get('/erp/admin/users', authMiddleware, async (req, res) => {
  if (req.admin.role !== 'super-admin') {
    return res.status(403).json({ error: 'forbidden' });
  }
  try {
    const { rows } = await db.query(
      'SELECT id, name, email, role, is_active, created_at FROM admin_users ORDER BY created_at DESC'
    );
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// POST /erp/admin/users — buat admin baru (super-admin only)
router.post('/erp/admin/users', authMiddleware, async (req, res) => {
  if (req.admin.role !== 'super-admin') {
    return res.status(403).json({ error: 'forbidden' });
  }
  const { name, email, password, role } = req.body;
  const validRoles = ['super-admin','event-manager','finance','analyst','support'];
  if (!name || !email || !password || !validRoles.includes(role)) {
    return res.status(400).json({ error: 'bad_request', message: 'name, email, password, role wajib dan valid' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows: [admin] } = await db.query(
      `INSERT INTO admin_users (name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id, name, email, role`,
      [name, email, hash, role]
    );
    await auditRepo.log({
      adminId: req.admin.adminId, action: 'CREATE', entityType: 'USER',
      entityId: admin.id, afterState: { name, email, role }, ipAddress: req.ip,
    });
    res.status(201).json(admin);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'conflict', message: 'Email sudah digunakan' });
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

module.exports = router;
