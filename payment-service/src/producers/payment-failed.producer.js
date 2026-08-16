/**
 * payment-service — producers/payment-failed.producer.js
 */
const mq = require('../rabbitmq');

async function publish(payload) {
  await mq.publish('payment.failed', payload);
}

module.exports = { publish };
