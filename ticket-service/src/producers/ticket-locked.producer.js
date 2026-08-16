/**
 * ticket-service — producers/ticket-locked.producer.js
 */
const mq = require('../rabbitmq');

async function publish(payload) {
  await mq.publish('ticket.locked', payload);
}

module.exports = { publish };
