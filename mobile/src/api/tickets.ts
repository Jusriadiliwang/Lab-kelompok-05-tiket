import { apiClient } from './client';
import type { LockSeatRequest, LockSeatResponse, Order, Ticket } from '../types';

// POST /orders → ticket-service (Redis NX EX lock)
// Body: { event_id, seat_category_id, user_id }
export async function lockSeat(body: LockSeatRequest): Promise<LockSeatResponse> {
  const res = await apiClient.post<any>('/orders', {
    event_id:         body.eventId,
    seat_category_id: body.seatId,
    user_id:          body.userId,
  });
  const raw = res.data;
  return {
    reservationId: String(raw.id),
    expiresAt:     raw.lock_expires_at ?? raw.expiresAt,
    seatCode:      raw.seat_category_name ?? raw.seatCode ?? '',
    message:       raw.message ?? 'Kursi berhasil dikunci',
    price:         raw.price ? parseFloat(raw.price) : undefined,
    categoryName:  raw.seat_category_name ?? '',
    eventName:     raw.event_name ?? '',
  };
}

// GET /orders/:id → ticket-service
export async function getOrder(reservationId: string): Promise<Order> {
  const res = await apiClient.get<any>(`/orders/${reservationId}`);
  const o = res.data?.order ?? res.data;
  return {
    id:           String(o.id),
    userId:       String(o.user_id ?? o.userId ?? ''),
    seatId:       String(o.seat_category_id ?? o.seatId ?? ''),
    eventId:      String(o.event_id ?? o.eventId ?? ''),
    status:       (o.status?.toUpperCase() ?? 'PENDING') as any,
    expiresAt:    o.expires_at ?? o.expiresAt ?? '',
    createdAt:    o.created_at ?? o.createdAt ?? '',
    eventName:    o.event_name ?? o.eventName,
    eventDate:    o.event_date ?? o.eventDate,
    venue:        o.venue,
    categoryName: o.category_name ?? o.categoryName,
    seatCode:     o.seat_code ?? o.seatCode,
    price:        o.price ? parseFloat(o.price) : undefined,
  };
}

// DELETE /orders/:id → ticket-service (release lock manually)
export async function releaseOrder(reservationId: string): Promise<void> {
  await apiClient.delete(`/orders/${reservationId}`);
}

// GET /orders?user_id=:userId → ticket-service (all orders for user)
export async function getUserOrders(userId: string): Promise<Order[]> {
  const res = await apiClient.get<any>(`/orders?user_id=${userId}`);
  const raw = res.data;
  const list: any[] = Array.isArray(raw) ? raw : (raw?.data ?? raw?.orders ?? []);
  return list.map((o: any): Order => ({
    id:           String(o.id),
    userId:       String(o.user_id ?? o.userId ?? ''),
    seatId:       String(o.seat_category_id ?? o.seatId ?? ''),
    eventId:      String(o.event_id ?? o.eventId ?? ''),
    status:       (o.status?.toUpperCase() ?? 'PENDING') as any,
    expiresAt:    o.expires_at ?? o.expiresAt ?? '',
    createdAt:    o.created_at ?? o.createdAt ?? '',
    eventName:    o.event_name ?? o.eventName,
    eventDate:    o.event_date ?? o.eventDate,
    venue:        o.venue,
    categoryName: o.category_name ?? o.categoryName,
    seatCode:     o.seat_code ?? o.seatCode,
    price:        o.price ? parseFloat(o.price) : undefined,
  }));
}

// GET /tickets/:reservationId → ticket-service (e-ticket with QR)
export async function getTicket(reservationId: string): Promise<Ticket> {
  const res = await apiClient.get<Ticket>(`/tickets/${reservationId}`);
  return res.data;
}
