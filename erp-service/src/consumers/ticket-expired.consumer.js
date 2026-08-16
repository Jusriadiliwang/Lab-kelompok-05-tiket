/**
 * erp-service — consumers/ticket-expired.consumer.js
 * Update seat snapshot ke AVAILABLE saat ticket.expired / order.expired
 */
const snapshotRepo = require('../modules/snapshot/snapshot.repository');
const db           = require('../database');
const revenueRepo  = require('../modules/revenue/revenue.repository');

async function handle(data) {
  try {
    if (data.seat_category_id) {
      await snapshotRepo.updateSeatStatus(data.seat_category_id, 'AVAILABLE');
    }

    // Catat statistik expired
    if (data.event_id) {
      const today = new Date().toISOString().split('T')[0];
      const { rows: [existing] } = await db.query(
        'SELECT * FROM revenue_reports WHERE source_event_id=$1 AND report_date=$2',
        [data.event_id, today]
      );
      await revenueRepo.upsertReport({
        sourceEventId:  data.event_id,
        reportDate:     today,
        ticketsSold:    existing?.tickets_sold    || 0,
        ticketsLocked:  existing?.tickets_locked  || 0,
        ticketsExpired: (existing?.tickets_expired || 0) + 1,
        grossRevenue:   parseFloat(existing?.gross_revenue   || 0),
        refundedAmount: parseFloat(existing?.refunded_amount || 0),
      });
    }

    console.log(`[erp][ticket-expired.consumer] Order ${data.order_id} expired`);
  } catch (err) {
    console.error('[erp][ticket-expired.consumer] Error:', err.message);
  }
}

module.exports = { handle };
