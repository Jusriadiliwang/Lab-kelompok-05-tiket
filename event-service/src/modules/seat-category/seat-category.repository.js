/**
 * event-service — modules/seat-category/seat-category.repository.js
 * Query layer untuk tabel seat_categories
 */
const db = require('../../database');

async function findByEventId(eventId) {
  const { rows } = await db.query(
    'SELECT * FROM seat_categories WHERE event_id = $1 ORDER BY price',
    [eventId]
  );
  return rows;
}

async function bulkCreate(client, eventId, categories) {
  const result = [];
  for (const cat of categories) {
    const { rows: [c] } = await client.query(
      `INSERT INTO seat_categories (event_id, name, total_seats, available_seats, price)
       VALUES ($1, $2, $3, $3, $4) RETURNING *`,
      [eventId, cat.name, cat.total_seats, cat.price]
    );
    result.push(c);
  }
  return result;
}

async function decrement(client, eventId, seatCategoryId) {
  const { rows: [cat] } = await client.query(
    `SELECT * FROM seat_categories WHERE id=$1 AND event_id=$2 FOR UPDATE`,
    [seatCategoryId, eventId]
  );
  if (!cat) return null;
  if (cat.available_seats <= 0) return { soldOut: true };

  const { rows: [updated] } = await client.query(
    `UPDATE seat_categories SET available_seats = available_seats - 1, updated_at=NOW()
     WHERE id=$1
     RETURNING *, (SELECT name FROM events WHERE id=event_id) AS event_name`,
    [seatCategoryId]
  );
  return updated;
}

async function increment(eventId, seatCategoryId) {
  const { rows: [updated] } = await db.query(
    `UPDATE seat_categories SET available_seats = available_seats + 1, updated_at=NOW()
     WHERE id=$1 AND event_id=$2 AND available_seats < total_seats RETURNING *`,
    [seatCategoryId, eventId]
  );
  return updated || null;
}

module.exports = { findByEventId, bulkCreate, decrement, increment };
