/**
 * payment-service — jobs/expire-order.job.js
 * Cron setiap 1 menit: expire payment yang melewati batas waktu → publish payment.failed
 */
const orderRepo = require('../modules/order/order.repository');
const paymentFailedProducer = require('../producers/payment-failed.producer');

async function run() {
  try {
    const expired = await orderRepo.findExpiredPending();
    for (const payment of expired) {
      await orderRepo.markFailed(payment.id);
      await paymentFailedProducer.publish({
        payment_id: payment.id,
        order_id:   payment.order_id,
        user_id:    payment.user_id,
        reason:     'TIMEOUT',
      });
      console.log(`[expire-order] Payment ${payment.id} kedaluwarsa (TIMEOUT)`);
    }
    if (expired.length > 0) {
      console.log(`[expire-order] ${expired.length} payment kedaluwarsa diproses`);
    }
  } catch (err) {
    console.error('[expire-order] Error:', err.message);
  }
}

function start() {
  setInterval(run, 60 * 1000);
  setTimeout(run, 5000);
  console.log('[expire-order] Job aktif — interval 1 menit');
}

module.exports = { start, run };
