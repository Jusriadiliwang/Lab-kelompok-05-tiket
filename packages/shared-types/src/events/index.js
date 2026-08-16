/**
 * shared-types — src/events/index.js
 * Schema/topic untuk event Kafka/RabbitMQ yang diproduksi dan dikonsumsi antar service
 *
 * Digunakan sebagai dokumentasi contract — bukan runtime validation.
 * Untuk runtime validation tambahkan Joi/Zod di masa depan.
 */

/**
 * Topic: ticket.locked
 * Producer: ticket-service
 * Consumer: payment-service (audit log)
 * @typedef {{ order_id: string, user_id: string, event_id: string, seat_category_id: string, price: number, expires_at: string }} TicketLockedEvent
 */

/**
 * Topic: ticket.confirmed
 * Producer: ticket-service
 * Consumer: notification-service
 * @typedef {{ ticket_id: string, order_id: string, user_id: string, event_name: string, seat_category: string, seat_number: string, qr_code: string, payment_id: string }} TicketConfirmedEvent
 */

/**
 * Topic: ticket.expired / order.expired
 * Producer: ticket-service (expire-reservation.job)
 * Consumer: notification-service
 * @typedef {{ order_id: string, user_id: string, event_id: string, event_name: string }} TicketExpiredEvent
 */

/**
 * Topic: payment.confirmed
 * Producer: payment-service
 * Consumer: ticket-service
 * @typedef {{ payment_id: string, order_id: string, user_id: string, amount: number, method: string, paid_at: string }} PaymentConfirmedEvent
 */

/**
 * Topic: payment.failed
 * Producer: payment-service
 * Consumer: ticket-service, notification-service
 * @typedef {{ payment_id: string, order_id: string, user_id: string, reason: 'TIMEOUT'|'DECLINED' }} PaymentFailedEvent
 */

const Topics = Object.freeze({
  TICKET_LOCKED:     'ticket.locked',
  TICKET_CONFIRMED:  'ticket.confirmed',
  TICKET_EXPIRED:    'ticket.expired',
  ORDER_EXPIRED:     'order.expired',
  ORDER_CANCELLED:   'order.cancelled',
  PAYMENT_CONFIRMED: 'payment.confirmed',
  PAYMENT_FAILED:    'payment.failed',
  PAYMENT_CANCELLED: 'payment.cancelled',
  PAYMENT_SUCCESS:   'payment.success',
});

module.exports = { Topics };
