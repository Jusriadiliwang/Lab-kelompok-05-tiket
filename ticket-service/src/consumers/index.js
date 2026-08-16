/**
 * ticket-service — consumers/index.js
 * Router: routing key → consumer handler
 */
const paymentConfirmedConsumer = require('./payment-confirmed.consumer');
const paymentFailedConsumer    = require('./payment-failed.consumer');

async function handleMessage(routingKey, data) {
  console.log(`[ticket-service] Event diterima: ${routingKey}`);
  switch (routingKey) {
    case 'payment.confirmed':
      await paymentConfirmedConsumer.handle(data);
      break;
    case 'payment.failed':
      await paymentFailedConsumer.handle(data);
      break;
    default:
      console.warn(`[ticket-service] Event tidak dikenal: ${routingKey}`);
  }
}

module.exports = { handleMessage };
