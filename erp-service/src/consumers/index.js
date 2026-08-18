/**
 * erp-service — consumers/index.js
 * Router: routing key → consumer handler
 * M6: Semua event bisnis di-log ke audit_logs (immutable)
 */
const ticketConfirmedConsumer = require('./ticket-confirmed.consumer');
const ticketExpiredConsumer   = require('./ticket-expired.consumer');
const auditRepo               = require('../modules/audit/audit.repository');

// Map event ke entity type untuk audit trail
const EVENT_AUDIT_MAP = {
  'ticket.confirmed':  { entityType: 'ORDER',   action: 'UPDATE' },
  'ticket.expired':    { entityType: 'ORDER',   action: 'UPDATE' },
  'ticket.locked':     { entityType: 'ORDER',   action: 'CREATE' },
  'payment.confirmed': { entityType: 'PAYMENT', action: 'UPDATE' },
  'payment.failed':    { entityType: 'PAYMENT', action: 'UPDATE' },
  'payment.cancelled': { entityType: 'PAYMENT', action: 'REFUND' },
  'order.expired':     { entityType: 'ORDER',   action: 'UPDATE' },
  'order.cancelled':   { entityType: 'ORDER',   action: 'UPDATE' },
};

async function handleMessage(routingKey, data) {
  console.log(`[erp-service] Event diterima: ${routingKey}`);

  // M6: Catat semua business event ke audit_log (immutable)
  const auditMeta = EVENT_AUDIT_MAP[routingKey];
  if (auditMeta) {
    await auditRepo.log({
      adminId: null,                           // system event (bukan aksi admin)
      action: auditMeta.action,
      entityType: auditMeta.entityType,
      entityId: String(data.order_id || data.payment_id || data.reservation_id || ''),
      afterState: { event: routingKey, ...data },
    }).catch(e => console.error('[erp-service][audit] Gagal log business event:', e.message));
  }

  switch (routingKey) {
    case 'ticket.confirmed':
      await ticketConfirmedConsumer.handle(data);
      break;
    case 'ticket.expired':
    case 'order.expired':
    case 'order.cancelled':
      await ticketExpiredConsumer.handle(data);
      break;
    default:
      console.log(`[erp-service] Event tidak diproses lebih lanjut: ${routingKey}`);
  }
}

module.exports = { handleMessage };
