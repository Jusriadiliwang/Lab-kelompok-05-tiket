/**
 * event-service — modules/event/event.repository.js
 * Query layer untuk tabel events dan seat_categories
 */
const db = require('../../database');

async function findAll() {
  const { rows } = await db.query('SELECT * FROM events ORDER BY event_date ASC');
  return rows;
}

async function findById(id) {
  const { rows: [event] } = await db.query('SELECT * FROM events WHERE id = $1', [id]);
  return event || null;
}

async function findCatalog(limit, offset) {
  const { rows } = await db.query(
    `SELECT e.*,
            json_agg(
              json_build_object(
                'id', sc.id,
                'name', sc.name,
                'total_seats', sc.total_seats,
                'available_seats', sc.available_seats,
                'price', sc.price
              ) ORDER BY sc.price
            ) AS categories
     FROM events e
     JOIN seat_categories sc ON sc.event_id = e.id
     WHERE e.status IN ('on_sale', 'upcoming')
       AND sc.available_seats > 0
     GROUP BY e.id
     ORDER BY e.event_date ASC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

async function countCatalog() {
  const { rows: [{ count }] } = await db.query(
    `SELECT COUNT(DISTINCT e.id) FROM events e
     JOIN seat_categories sc ON sc.event_id = e.id
     WHERE e.status IN ('on_sale','upcoming') AND sc.available_seats > 0`
  );
  return parseInt(count);
}

async function create(client, { name, venue, event_date, description, banner_url }) {
  const { rows: [event] } = await client.query(
    `INSERT INTO events (name, venue, event_date, description, banner_url, status)
     VALUES ($1, $2, $3, $4, $5, 'upcoming') RETURNING *`,
    [name, venue, event_date, description, banner_url]
  );
  return event;
}

async function updateStatus(id, status) {
  const { rows: [event] } = await db.query(
    'UPDATE events SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
    [status, id]
  );
  return event || null;
}

module.exports = { findAll, findById, findCatalog, countCatalog, create, updateStatus };
