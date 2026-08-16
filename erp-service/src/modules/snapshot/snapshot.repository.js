/**
 * erp-service — modules/snapshot/snapshot.repository.js
 * Read/write ERP_EVENT_SNAPSHOT dan ERP_SEAT_SNAPSHOT
 */
const db = require('../../database');

// ── Event Snapshot ────────────────────────────────────────────
async function upsertEventSnapshot(event) {
  const { rows: [row] } = await db.query(
    `INSERT INTO erp_event_snapshots
       (source_event_id, name, venue, event_date, sale_open_at, sale_close_at, status, synced_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
     ON CONFLICT (source_event_id) DO UPDATE SET
       name=EXCLUDED.name, venue=EXCLUDED.venue, event_date=EXCLUDED.event_date,
       sale_open_at=EXCLUDED.sale_open_at, sale_close_at=EXCLUDED.sale_close_at,
       status=EXCLUDED.status, synced_at=NOW()
     RETURNING *`,
    [event.id, event.name, event.venue, event.event_date,
     event.sale_open_at || null, event.sale_close_at || null, event.status || 'upcoming']
  );
  return row;
}

async function upsertSeatSnapshot(erpEventId, cat) {
  const { rows: [row] } = await db.query(
    `INSERT INTO erp_seat_snapshots
       (erp_event_id, source_cat_id, category_name, total_seats, available_seats, locked_seats, sold_seats, price, synced_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
     ON CONFLICT (erp_event_id, source_cat_id) DO UPDATE SET
       category_name=EXCLUDED.category_name, total_seats=EXCLUDED.total_seats,
       available_seats=EXCLUDED.available_seats, locked_seats=EXCLUDED.locked_seats,
       sold_seats=EXCLUDED.sold_seats, price=EXCLUDED.price, synced_at=NOW()
     RETURNING *`,
    [erpEventId, cat.id, cat.name, cat.total_seats,
     cat.available_seats, cat.locked_seats || 0, cat.sold_seats || 0, cat.price]
  );
  return row;
}

async function findAllEvents({ status, limit = 50, offset = 0 } = {}) {
  let q = 'SELECT * FROM erp_event_snapshots WHERE 1=1';
  const params = [];
  if (status) { params.push(status); q += ` AND status=$${params.length}`; }
  params.push(limit, offset);
  q += ` ORDER BY event_date ASC LIMIT $${params.length - 1} OFFSET $${params.length}`;
  const { rows } = await db.query(q, params);
  return rows;
}

async function findEventById(sourceEventId) {
  const { rows: [ev] } = await db.query(
    'SELECT * FROM erp_event_snapshots WHERE source_event_id=$1', [sourceEventId]
  );
  return ev || null;
}

async function findSeatsByEvent(erpEventId) {
  const { rows } = await db.query(
    'SELECT * FROM erp_seat_snapshots WHERE erp_event_id=$1 ORDER BY price', [erpEventId]
  );
  return rows;
}

async function holdSeats(erpEventId, sourceCatId, count) {
  const { rows: [row] } = await db.query(
    `UPDATE erp_seat_snapshots
     SET held_seats = held_seats + $1,
         available_seats = GREATEST(0, available_seats - $1),
         status = 'HOLD', synced_at = NOW()
     WHERE erp_event_id=$2 AND source_cat_id=$3
     RETURNING *`,
    [count, erpEventId, sourceCatId]
  );
  return row || null;
}

async function updateSeatStatus(sourceCatId, status) {
  await db.query(
    `UPDATE erp_seat_snapshots SET status=$1, synced_at=NOW() WHERE source_cat_id=$2`,
    [status, sourceCatId]
  );
}

module.exports = {
  upsertEventSnapshot, upsertSeatSnapshot,
  findAllEvents, findEventById, findSeatsByEvent,
  holdSeats, updateSeatStatus,
};
