/**
 * ticket-service — rabbitmq.js
 * Publisher ke RabbitMQ
 * Kelompok 5: Ashabul Kahfi (Backend/API Engineer)
 */
const amqp = require('amqplib');

let channel = null;
const EXCHANGE = 'tiket_events';

async function connect() {
  let retries = 10;
  while (retries > 0) {
    try {
      const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
      channel = await conn.createChannel();
      await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
      console.log('[ticket-service] RabbitMQ terhubung');

      conn.on('error', (err) => {
        console.error('[ticket-service] RabbitMQ error:', err.message);
        channel = null;
      });
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
