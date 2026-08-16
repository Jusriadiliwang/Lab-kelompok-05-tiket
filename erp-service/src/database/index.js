/**
 * erp-service — database/index.js
 * Koneksi ke PostgreSQL erp_db
 */
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'erp_db',
  user:     process.env.DB_USER     || 'kelompok5',
  password: process.env.DB_PASSWORD || 'tiketkonser123',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[erp-service] DB pool error:', err.message);
});

module.exports = pool;
