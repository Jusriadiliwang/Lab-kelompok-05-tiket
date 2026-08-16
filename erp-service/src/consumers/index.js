/**
 * erp-service — consumers/index.js
 * Router: routing key → consumer handler
 */
const ticketConfirmedConsumer = require('./ticket-confirmed.consumer');
const ticketExpiredConsumer   = require('./ticket-expired.consumer');

async function handleMessage(routingKey, data) {
  console.log(`[erp-service] Event diterima: ${routingKey}`);
  switch (routingKey) {
    case 'ticket.confirmed':
      await ticketConfirmedConsumer.handle(data);
      break;
    case 'ticket.expired':
    case 'order.expired':
    case 'order.cancelled':
      await ticketExpiredConsumer.handle(data);
      break;
    default:
      // Log event lain untuk keperluan audit trail
      console.log(`[erp-service] Event tidak diproses: ${routingKey}`);
  }
}

module.exports = { handleMessage };
