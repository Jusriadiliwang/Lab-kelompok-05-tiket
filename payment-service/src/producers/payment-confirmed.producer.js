/**
 * payment-service — producers/payment-confirmed.producer.js
 */
const mq = require('../rabbitmq');

async function publish(payload) {
  await mq.publish('payment.confirmed', payload);
}

module.exports = { publish };
