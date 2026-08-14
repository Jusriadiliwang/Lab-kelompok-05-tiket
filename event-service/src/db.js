/**
 * event-service — db.js
 * Koneksi ke PostgreSQL event_db
 * Kelompok 5: Jusriadi Liwang (Data & Persistence Engineer)
 */
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'event_db',
  user:     process.env.DB_USER     || 'kelompok5',
  password: process.env.DB_PASSWORD || 'tiketkonser123',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[event-service] DB pool error:', err.message);
});

module.exports = pool;
