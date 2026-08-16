/**
 * ticket-service — database/index.js
 * Koneksi ke PostgreSQL ticket_db
 * Kelompok 5: Jusriadi Liwang (Data & Persistence Engineer)
 */
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'ticket_db',
  user:     process.env.DB_USER     || 'kelompok5',
  password: process.env.DB_PASSWORD || 'tiketkonser123',
  max: 30,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[ticket-service] DB pool error:', err.message);
});

module.exports = pool;
