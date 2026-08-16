/**
 * erp-service — jobs/generate-revenue-report.job.js
 * Setiap hari jam 00:00: rekap pendapatan harian per event
 * dari data snapshot + payment-service
 */
const fetch = require('node-fetch');
const db = require('../database');
const revenueRepo = require('../modules/revenue/revenue.repository');

const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3003';

async function run() {
  const today = new Date().toISOString().split('T')[0];
  console.log(`[generate-revenue-report] Generating report untuk ${today}`);

  try {
    // Ambil semua event dari snapshot
    const { rows: events } = await db.query('SELECT source_event_id FROM erp_event_snapshots');

    for (const { source_event_id } of events) {
      try {
        // Ambil data payment dari payment-service
        const res = await fetch(`${PAYMENT_SERVICE_URL}/payments?order_id=&user_id=`);
        // Kalkulasi dari snapshot seat (approximasi)
        const { rows: [seats] } = await db.query(
          `SELECT
             SUM(sold_seats)    AS sold,
             SUM(locked_seats)  AS locked,
             (SELECT SUM(total_seats - available_seats - sold_seats - locked_seats - held_seats)
              FROM erp_seat_snapshots WHERE erp_event_id IN (
                SELECT id FROM erp_event_snapshots WHERE source_event_id=$1
              )) AS expired
           FROM erp_seat_snapshots
           WHERE erp_event_id IN (SELECT id FROM erp_event_snapshots WHERE source_event_id=$1)`,
          [source_event_id]
        );

        // Gross revenue dari revenue_reports yang sudah ada (akumulatif)
        const { rows: [prev] } = await db.query(
          `SELECT COALESCE(SUM(gross_revenue),0) AS gross, COALESCE(SUM(refunded_amount),0) AS refunded
           FROM revenue_reports WHERE source_event_id=$1`,
          [source_event_id]
        );

        await revenueRepo.upsertReport({
          sourceEventId:   source_event_id,
          reportDate:      today,
          ticketsSold:     parseInt(seats?.sold     || 0),
          ticketsLocked:   parseInt(seats?.locked   || 0),
          ticketsExpired:  parseInt(seats?.expired  || 0),
          grossRevenue:    parseFloat(prev?.gross   || 0),
          refundedAmount:  parseFloat(prev?.refunded || 0),
        });
      } catch (err) {
        console.error(`[generate-revenue-report] Error event ${source_event_id}:`, err.message);
      }
    }

    console.log(`[generate-revenue-report] Selesai — ${events.length} event diproses`);
  } catch (err) {
    console.error('[generate-revenue-report] Error:', err.message);
  }
}

function msUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight - now;
}

function start() {
  // Jalankan setiap hari tepat jam 00:00
  setTimeout(function tick() {
    run();
    setInterval(run, 24 * 60 * 60 * 1000);
  }, msUntilMidnight());
  console.log('[generate-revenue-report] Job aktif — setiap hari 00:00');
}

module.exports = { start, run };
