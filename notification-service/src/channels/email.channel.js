/**
 * notification-service — channels/email.channel.js
 * Channel pengiriman email (nodemailer / SendGrid — stub untuk dev)
 */

async function send({ to, subject, html }) {
  // TODO: integrasikan dengan nodemailer atau SendGrid
  console.log(`[email.channel] STUB — kirim email ke ${to}: ${subject}`);
  return true;
}

module.exports = { send };
