/**
 * ticket-service — producers/ticket-confirmed.producer.js
 */
const mq = require('../rabbitmq');

async function publish(payload) {
  await mq.publish('ticket.confirmed', payload);
}

module.exports = { publish };
