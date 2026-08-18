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

// PUT /erp/admin/users/:id — update role / deactivate admin (super-admin only)
router.put('/erp/admin/users/:id', authMiddleware, async (req, res) => {
  if (req.admin.role !== 'super-admin') return res.status(403).json({ error: 'forbidden' });
  const { role, is_active, name } = req.body;
  const validRoles = ['super-admin','event-manager','finance','analyst','support'];
  if (role && !validRoles.includes(role)) {
    return res.status(400).json({ error: 'bad_request', message: `Role harus: ${validRoles.join(', ')}` });
  }
  try {
    const sets = []; const params = [];
    if (name)                    { params.push(name);      sets.push(`name=$${params.length}`); }
    if (role)                    { params.push(role);      sets.push(`role=$${params.length}`); }
    if (is_active !== undefined) { params.push(is_active); sets.push(`is_active=$${params.length}`); }
    if (!sets.length) return res.status(400).json({ error: 'bad_request', message: 'Tidak ada field yang diupdate' });
    params.push(req.params.id);
    sets.push('updated_at=NOW()');
    const { rows: [admin] } = await db.query(
      `UPDATE admin_users SET ${sets.join(',')} WHERE id=$${params.length} RETURNING id, name, email, role, is_active`,
      params
    );
    if (!admin) return res.status(404).json({ error: 'not_found', message: 'Admin tidak ditemukan' });
    await auditRepo.log({
      adminId: req.admin.adminId, action: 'UPDATE', entityType: 'USER',
      entityId: admin.id, afterState: { role, is_active, name }, ipAddress: req.ip,
    });
    res.json(admin);
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// PUT /erp/auth/change-password — ganti password sendiri
router.put('/erp/auth/change-password', authMiddleware, async (req, res) => {
  const { old_password, new_password } = req.body;
  if (!old_password || !new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'bad_request', message: 'old_password dan new_password (min 6 char) wajib' });
  }
  try {
    const { rows: [admin] } = await db.query('SELECT * FROM admin_users WHERE id=$1', [req.admin.adminId]);
    if (!admin) return res.status(404).json({ error: 'not_found' });
    const valid = await bcrypt.compare(old_password, admin.password_hash);
    if (!valid) return res.status(401).json({ error: 'unauthorized', message: 'Password lama salah' });
    const newHash = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE admin_users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [newHash, admin.id]);
    await auditRepo.log({ adminId: admin.id, action: 'UPDATE', entityType: 'USER', entityId: admin.id, ipAddress: req.ip });
    res.json({ message: 'Password berhasil diubah' });
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

module.exports = router;
