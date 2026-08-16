/**
 * payment-service — rabbitmq.js
 * Publisher + Consumer RabbitMQ
 * Kelompok 5: Ashabul Kahfi (Backend/API Engineer)
 */
const amqp = require('amqplib');

let channel     = null;
const EXCHANGE  = 'tiket_events';

async function connect(onMessage) {
  let retries = 10;
  while (retries > 0) {
    try {
      const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
      channel = await conn.createChannel();
      await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

      // Consumer untuk event dari ticket-service (jika diperlukan)
      if (onMessage) {
        const q = await channel.assertQueue('payment-service.ticket_events', { durable: true });
        const patterns = ['ticket.locked', 'order.created'];
        for (const pattern of patterns) {
          await channel.bindQueue(q.queue, EXCHANGE, pattern);
        }
        channel.prefetch(5);
        channel.consume(q.queue, async (msg) => {
          if (!msg) return;
          try {
            const data = JSON.parse(msg.content.toString());
            await onMessage(msg.fields.routingKey, data);
            channel.ack(msg);
          } catch (err) {
            console.error('[payment-service] Consumer error:', err.message);
            channel.nack(msg, false, false);
          }
        });
        console.log('[payment-service] RabbitMQ consumer aktif: ticket.locked, order.created');
      }

      conn.on('error', (err) => {
        console.error('[payment-service] RabbitMQ conn error:', err.message);
        channel = null;
      });

      console.log('[payment-service] RabbitMQ terhubung');
      return;
    } catch (err) {
      retries--;
      console.log(`[payment-service] Menunggu RabbitMQ... (${retries} tersisa)`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

async function publish(routingKey, payload) {
  if (!channel) return;
  try {
    channel.publish(
      EXCHANGE,
      routingKey,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true }
    );
    console.log(`[payment-service] Published: ${routingKey}`);
  } catch (err) {
    console.error('[payment-service] Gagal publish:', err.message);
  }
}

module.exports = { connect, publish };
