/**
 * notification-service — channels/push.channel.js
 * Channel pengiriman push notification (Firebase FCM — stub untuk dev)
 */

async function send({ userId, title, body }) {
  // TODO: integrasikan dengan Firebase FCM
  console.log(`[push.channel] STUB — kirim push ke user ${userId}: ${title}`);
  return true;
}

module.exports = { send };
