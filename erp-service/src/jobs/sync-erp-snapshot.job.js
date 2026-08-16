/**
 * erp-service — jobs/sync-erp-snapshot.job.js
 * Setiap 5 menit: sync ERP_EVENT_SNAPSHOT dan ERP_SEAT_SNAPSHOT
 * dari event-service via REST (bukan JOIN langsung ke DB microservice)
 */
const fetch = require('node-fetch');
const snapshotRepo = require('../modules/snapshot/snapshot.repository');

const EVENT_SERVICE_URL = process.env.EVENT_SERVICE_URL || 'http://localhost:3001';

async function run() {
  try {
    const res = await fetch(`${EVENT_SERVICE_URL}/events`);
    if (!res.ok) {
      console.error('[sync-erp-snapshot] event-service tidak dapat dihubungi:', res.status);
      return;
    }
    const { data: events } = await res.json();
    let synced = 0;

    for (const event of events) {
      const snapshot = await snapshotRepo.upsertEventSnapshot(event);

      // Sync seat categories jika ada
      if (event.categories && event.categories.length > 0) {
        for (const cat of event.categories) {
          await snapshotRepo.upsertSeatSnapshot(snapshot.id, cat);
        }
      } else {
        // Ambil seats secara terpisah
        try {
          const seatRes = await fetch(`${EVENT_SERVICE_URL}/events/${event.id}/seats`);
          if (seatRes.ok) {
            const seatData = await seatRes.json();
            for (const cat of (seatData.categories || [])) {
              await snapshotRepo.upsertSeatSnapshot(snapshot.id, cat);
            }
          }
        } catch { /* skip */ }
      }
      synced++;
    }

    console.log(`[sync-erp-snapshot] Synced ${synced} events`);
  } catch (err) {
    console.error('[sync-erp-snapshot] Error:', err.message);
  }
}

function start() {
  setInterval(run, 5 * 60 * 1000); // setiap 5 menit
  setTimeout(run, 10000);           // jalankan sekali saat startup
  console.log('[sync-erp-snapshot] Job aktif — interval 5 menit');
}

module.exports = { start, run };
