/**
 * ticket-service — producers/ticket-expired.producer.js
 */
const mq = require('../rabbitmq');

async function publish(payload) {
  await mq.publish('ticket.expired', payload);
}

module.exports = { publish };
