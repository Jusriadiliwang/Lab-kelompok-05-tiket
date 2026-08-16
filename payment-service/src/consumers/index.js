/**
 * payment-service — consumers/index.js
 * Router: routing key → consumer handler
 */
const ticketLockedConsumer = require('./ticket-locked.consumer');

async function handleMessage(routingKey, data) {
  console.log(`[payment-service] Event diterima: ${routingKey}`);
  switch (routingKey) {
    case 'ticket.locked':
    case 'order.created':
      await ticketLockedConsumer.handle(data);
      break;
    default:
      console.warn(`[payment-service] Event tidak dikenal: ${routingKey}`);
  }
}

module.exports = { handleMessage };
