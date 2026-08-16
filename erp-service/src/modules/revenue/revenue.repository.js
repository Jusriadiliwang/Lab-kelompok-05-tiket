/**
 * erp-service — modules/revenue/revenue.repository.js
 * M3: Query revenue_reports
 */
const db = require('../../database');

async function upsertReport({ sourceEventId, reportDate, ticketsSold, ticketsLocked, ticketsExpired, grossRevenue, refundedAmount }) {
  const { rows: [row] } = await db.query(
    `INSERT INTO revenue_reports
       (source_event_id, report_date, tickets_sold, tickets_locked, tickets_expired, gross_revenue, refunded_amount)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (source_event_id, report_date) DO UPDATE SET
       tickets_sold=EXCLUDED.tickets_sold,
       tickets_locked=EXCLUDED.tickets_locked,
       tickets_expired=EXCLUDED.tickets_expired,
       gross_revenue=EXCLUDED.gross_revenue,
       refunded_amount=EXCLUDED.refunded_amount,
       generated_at=NOW()
     RETURNING *`,
    [sourceEventId, reportDate, ticketsSold, ticketsLocked, ticketsExpired, grossRevenue, refundedAmount]
  );
  return row;
}

async function findReports({ eventId, startDate, endDate, limit = 100, offset = 0 }) {
  let q = 'SELECT r.*, e.name AS event_name FROM revenue_reports r LEFT JOIN erp_event_snapshots e ON r.source_event_id=e.source_event_id WHERE 1=1';
  const params = [];
  if (eventId)   { params.push(eventId);   q += ` AND r.source_event_id=$${params.length}`; }
  if (startDate) { params.push(startDate); q += ` AND r.report_date>=$${params.length}`; }
  if (endDate)   { params.push(endDate);   q += ` AND r.report_date<=$${params.length}`; }
  params.push(limit, offset);
  q += ` ORDER BY r.report_date DESC LIMIT $${params.length-1} OFFSET $${params.length}`;
  const { rows } = await db.query(q, params);
  return rows;
}

async function getSummary(eventId) {
  const { rows: [row] } = await db.query(
    `SELECT
       SUM(tickets_sold)    AS total_sold,
       SUM(tickets_expired) AS total_expired,
       SUM(gross_revenue)   AS total_gross,
       SUM(refunded_amount) AS total_refunded,
       SUM(net_revenue)     AS total_net
     FROM revenue_reports WHERE source_event_id=$1`,
    [eventId]
  );
  return row;
}

module.exports = { upsertReport, findReports, getSummary };
