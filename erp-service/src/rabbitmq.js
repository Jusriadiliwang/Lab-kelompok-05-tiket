/**
 * erp-service — rabbitmq.js
 * Consumer RabbitMQ — subscribe ke semua event bisnis
 */
const amqp = require('amqplib');

const EXCHANGE = 'tiket_events';

async function connect(onMessage) {
  let retries = 10;
  while (retries > 0) {
    try {
      const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
      const ch   = await conn.createChannel();
      await ch.assertExchange(EXCHANGE, 'topic', { durable: true });

      const q = await ch.assertQueue('erp-service.all_events', { durable: true });

      const patterns = [
        'ticket.confirmed', 'ticket.expired',
        'payment.confirmed', 'payment.failed',
        'order.expired', 'order.cancelled',
      ];
      for (const pattern of patterns) {
        await ch.bindQueue(q.queue, EXCHANGE, pattern);
      }

      ch.prefetch(5);
      ch.consume(q.queue, async (msg) => {
        if (!msg) return;
        try {
          const data = JSON.parse(msg.content.toString());
          await onMessage(msg.fields.routingKey, data);
          ch.ack(msg);
        } catch (err) {
          console.error('[erp-service] Consumer error:', err.message);
          ch.nack(msg, false, false);
        }
      });

      conn.on('error', (err) => {
        console.error('[erp-service] RabbitMQ error:', err.message);
      });

      console.log('[erp-service] RabbitMQ consumer aktif:', patterns.join(', '));
      return;
    } catch (err) {
      retries--;
      console.log(`[erp-service] Menunggu RabbitMQ... (${retries} tersisa)`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

module.exports = { connect };
