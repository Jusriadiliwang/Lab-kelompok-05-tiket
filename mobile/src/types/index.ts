// Types aligned with backend schemas (db-init/*.sql + openapi.yaml)

// ── Auth ─────────────────────────────────────────────────────
export interface AuthToken {
  token: string;
  userId: string;
  role: string;
}

// ── Event Service ─────────────────────────────────────────────
export interface SeatCategory {
  id: string;
  eventId: string;
  name: string;   // VIP | REGULER | FESTIVAL | VVIP | Day Pass | 3-Day Pass | etc.
  totalSeats: number;
  price: number;
  availableSeats?: number;
}

// Actual DB values: 'upcoming'|'on_sale'|'sold_out'|'completed'|'cancelled'
// ERD design values: DRAFT|PUBLISHED|CANCELLED
export type EventStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'CANCELLED'
  | 'UPCOMING'
  | 'SOLD_OUT'
  | 'COMPLETED'
  | 'ON_SALE';     // DB raw, sebelum mapping

export interface Event {
  id: string;
  name: string;
  eventDate: string;        // ISO8601
  venue: string;
  status: EventStatus;
  description?: string;
  bannerUrl?: string;
  categories?: SeatCategory[];
}

export interface CatalogEvent extends Event {
  minPrice: number;
  totalSeats: number;
  availableSeats: number;
}

// ── Ticket Service ────────────────────────────────────────────
// Actual DB: 'locked'|'confirmed'|'cancelled'|'expired'
// ERD design: PENDING|CONFIRMED|EXPIRED|CANCELLED
// Mobile normalises to UPPER_CASE via .toUpperCase()
export type OrderStatus =
  | 'LOCKED'     // DB: 'locked' — kursi dikunci, menunggu pembayaran
  | 'PENDING'    // ERD design alias (sama dengan LOCKED)
  | 'CONFIRMED'  // DB: 'confirmed' — pembayaran berhasil
  | 'EXPIRED'    // DB: 'expired'  — waktu habis, kursi dilepas
  | 'CANCELLED'; // DB: 'cancelled' — dibatalkan manual

export interface Order {
  id: string;
  userId: string;
  seatId: string;
  eventId: string;
  status: OrderStatus;
  expiresAt: string;        // ISO8601
  createdAt: string;
  categoryName?: string;
  seatCode?: string;
  eventName?: string;
  eventDate?: string;
  venue?: string;
  price?: number;
}

export interface LockSeatRequest {
  eventId: string;
  seatId: string;           // seat_category id (lock by category)
  userId: string;
}

export interface LockSeatResponse {
  reservationId: string;
  expiresAt: string;
  seatCode: string;
  message: string;
  price?: number;
  categoryName?: string;
  eventName?: string;
}

// ── Payment Service ───────────────────────────────────────────
// Actual DB: 'pending'|'success'|'failed'|'cancelled'|'refunded'
// ERD design: PENDING|PAID|FAILED|REFUNDED
export type PaymentStatus =
  | 'PENDING'    // DB: 'pending'
  | 'SUCCESS'    // DB: 'success'  (ERD calls it PAID)
  | 'PAID'       // ERD design alias for SUCCESS
  | 'FAILED'     // DB: 'failed'
  | 'CANCELLED'  // DB: 'cancelled'
  | 'REFUNDED';  // DB: 'refunded'

export type PaymentMethod = 'bank_transfer' | 'credit_card' | 'gopay' | 'ovo' | 'dana';

export interface Payment {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  paidAt?: string;
  expiresAt?: string;
}

export interface CreatePaymentRequest {
  reservationId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  userId: string;
}

export interface CreatePaymentResponse {
  orderId: string;
  message: string;
}

// ── Ticket / E-Ticket ─────────────────────────────────────────
export interface Ticket {
  id: string;
  orderId: string;
  seatId: string;
  qrCode: string;
  issuedAt: string;
  eventName?: string;
  eventDate?: string;
  venue?: string;
  seatCode?: string;
  categoryName?: string;
}

// ── Notification ──────────────────────────────────────────────
export type NotifType    = 'ETICKET' | 'REMINDER' | 'FAILED_PAYMENT' | 'PAYMENT_REFUNDED' | 'ORDER_EXPIRING' | 'ORDER_CANCELLED';
export type NotifChannel = 'EMAIL' | 'PUSH';
export type NotifStatus  = 'QUEUED' | 'SENT' | 'FAILED';

export interface Notification {
  id: string;
  userId: string;
  type: NotifType;
  channel: NotifChannel;
  status: NotifStatus;
  payload: Record<string, any>;
  sentAt?: string;
}

// ── ERP Analytics (M4) ────────────────────────────────────────
export interface ErpAnalytics {
  eventId: string;
  eventName: string;
  totalSeats: number;
  ticketsSold: number;
  ticketsLocked: number;
  ticketsExpired: number;
  ticketsAvailable: number;
  conversionRate: number;
  grossRevenue: number;
}

// ── Navigation ────────────────────────────────────────────────
export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Events: undefined;
  MyTickets: undefined;
  Notifications: undefined;
  Profile: undefined;
};

export type HomeStackParamList = {
  HomeScreen: undefined;
  EventDetail: { eventId: string };
  Queue: {
    reservationId: string;
    expiresAt: string;
    price: number;
    categoryName: string;
    eventName: string;
    eventId: string;
  };
  Checkout: {
    reservationId: string;
    expiresAt: string;
    price: number;
    categoryName: string;
    eventName: string;
  };
  OrderConfirmation: { orderId: string };
};
