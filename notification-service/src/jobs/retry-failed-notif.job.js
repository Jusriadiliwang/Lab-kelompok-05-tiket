/**
 * notification-service — jobs/retry-failed-notif.job.js
 * Cron setiap 5 menit: retry notifikasi yang gagal (max 3x)
 */
const notifRepo = require('../modules/notification/notification.repository');

const MAX_RETRY = 3;

async function run() {
  try {
    const failed = await notifRepo.findFailed(50);
    for (const notif of failed) {
      const retryCount = notif.retry_count || 0;
      if (retryCount >= MAX_RETRY) continue;

      // Simulasi pengiriman ulang
      console.log(`[retry-failed-notif] Retry notifikasi #${notif.id} (percobaan ${retryCount + 1})`);
      try {
        // TODO: panggil email/push channel yang sesuai berdasarkan notif.type
        await notifRepo.markSent(notif.id);
      } catch {
        await notifRepo.markFailed(notif.id);
      }
    }
    if (failed.length > 0) {
      console.log(`[retry-failed-notif] ${failed.length} notifikasi diproses ulang`);
    }
  } catch (err) {
    console.error('[retry-failed-notif] Error:', err.message);
  }
}

function start() {
  setInterval(run, 5 * 60 * 1000);
  setTimeout(run, 10000);
  console.log('[retry-failed-notif] Job aktif — interval 5 menit');
}

module.exports = { start, run };
