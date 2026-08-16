/**
 * shared-types — src/enums/index.js
 * Enum status yang dipakai bersama oleh semua service
 */

const ReservationStatus = Object.freeze({
  PENDING:   'locked',
  CONFIRMED: 'confirmed',
  EXPIRED:   'expired',
  CANCELLED: 'cancelled',
});

const OrderStatus = Object.freeze({
  PENDING:  'pending',
  PAID:     'success',
  FAILED:   'failed',
  REFUNDED: 'refunded',
});

const NotificationType = Object.freeze({
  ETICKET:         'eticket',
  TICKET_CONFIRMED: 'ticket_confirmed',
  ORDER_EXPIRING:  'order_expiring',
  ORDER_CANCELLED: 'order_cancelled',
  PAYMENT_FAILED:  'payment_failed',
  PAYMENT_REFUNDED:'payment_refunded',
});

const EventStatus = Object.freeze({
  UPCOMING:   'upcoming',
  ON_SALE:    'on_sale',
  SOLD_OUT:   'sold_out',
  COMPLETED:  'completed',
  CANCELLED:  'cancelled',
});

module.exports = { ReservationStatus, OrderStatus, NotificationType, EventStatus };
