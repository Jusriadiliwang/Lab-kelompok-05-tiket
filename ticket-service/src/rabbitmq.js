/**
 * ticket-service — rabbitmq.js
 * Publisher + Consumer RabbitMQ
 * Kelompok 5: Ashabul Kahfi (Backend/API Engineer)
 */
const amqp = require('amqplib');

let channel = null;
const EXCHANGE = 'tiket_events';

async function connect(onMessage) {
  let retries = 10;
  while (retries > 0) {
    try {
      const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
      channel = await conn.createChannel();
      await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

      // Consumer untuk event dari payment-service
      if (onMessage) {
        const q = await channel.assertQueue('ticket-service.payment_events', { durable: true });
        const patterns = ['payment.confirmed', 'payment.failed'];
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
            console.error('[ticket-service] Consumer error:', err.message);
            channel.nack(msg, false, false); // requeue=false: buang pesan rusak
          }
        });
        console.log('[ticket-service] RabbitMQ consumer aktif: payment.confirmed, payment.failed');
      }

      conn.on('error', (err) => {
        console.error('[ticket-service] RabbitMQ error:', err.message);
        channel = null;
      });

      console.log('[ticket-service] RabbitMQ terhubung');
      return;
    } catch (err) {
      retries--;
      console.log(`[ticket-service] Menunggu RabbitMQ... (${retries} tersisa)`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

async function publish(routingKey, payload) {
  if (!channel) {
    console.warn('[ticket-service] RabbitMQ channel belum siap, pesan dibuang');
    return;
  }
  try {
    channel.publish(
      EXCHANGE,
      routingKey,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true }
    );
    console.log(`[ticket-service] Published: ${routingKey}`, payload);
  } catch (err) {
    console.error('[ticket-service] Gagal publish:', err.message);
  }
}

module.exports = { connect, publish };
