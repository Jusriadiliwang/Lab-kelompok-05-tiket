/**
 * erp-service — consumers/ticket-confirmed.consumer.js
 * Update seat snapshot ke SOLD saat ticket.confirmed
 */
const snapshotRepo = require('../modules/snapshot/snapshot.repository');
const revenueRepo  = require('../modules/revenue/revenue.repository');
const db           = require('../database');

async function handle(data) {
  try {
    // Update status kursi di snapshot
    if (data.seat_category_id) {
      await snapshotRepo.updateSeatStatus(data.seat_category_id, 'SOLD');
    }

    // Catat revenue dari payment
    if (data.event_id && data.amount) {
      const today = new Date().toISOString().split('T')[0];
      const { rows: [existing] } = await db.query(
        'SELECT * FROM revenue_reports WHERE source_event_id=$1 AND report_date=$2',
        [data.event_id, today]
      );
      await revenueRepo.upsertReport({
        sourceEventId:   data.event_id,
        reportDate:      today,
        ticketsSold:     (existing?.tickets_sold     || 0) + 1,
        ticketsLocked:   existing?.tickets_locked    || 0,
        ticketsExpired:  existing?.tickets_expired   || 0,
        grossRevenue:    parseFloat(existing?.gross_revenue   || 0) + parseFloat(data.amount || 0),
        refundedAmount:  parseFloat(existing?.refunded_amount || 0),
      });
    }

    console.log(`[erp][ticket-confirmed.consumer] Seat updated: order ${data.order_id}`);
  } catch (err) {
    console.error('[erp][ticket-confirmed.consumer] Error:', err.message);
  }
}

module.exports = { handle };
