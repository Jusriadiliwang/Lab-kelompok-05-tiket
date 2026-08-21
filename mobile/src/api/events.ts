import { apiClient } from './client';
import type { CatalogEvent, Event, EventStatus, SeatCategory, ErpAnalytics } from '../types';

// Map DB event status ke EventStatus type
// DB values: 'upcoming'|'on_sale'|'sold_out'|'completed'|'cancelled'
// ERD design: DRAFT|PUBLISHED|CANCELLED
function mapEventStatus(raw: string): EventStatus {
  switch (raw?.toLowerCase()) {
    case 'on_sale':   return 'PUBLISHED';
    case 'upcoming':  return 'UPCOMING';
    case 'sold_out':  return 'SOLD_OUT';
    case 'completed': return 'COMPLETED';
    case 'cancelled': return 'CANCELLED';
    case 'draft':     return 'DRAFT';
    default:          return 'PUBLISHED';
  }
}

function mapCategory(c: any): SeatCategory {
  return {
    id:             String(c.id),
    eventId:        String(c.event_id ?? ''),
    name:           c.name,
    totalSeats:     c.total_seats,
    price:          parseFloat(c.price ?? 0),
    availableSeats: c.available_seats,
  };
}

function mapCatalogItem(raw: any): CatalogEvent {
  const cats: any[] = raw.categories ?? [];
  const prices = cats.map((c: any) => parseFloat(c.price ?? c.min_price ?? 0)).filter(Boolean);
  const available = cats.reduce((s: number, c: any) => s + (c.available_seats ?? 0), 0);
  const total     = cats.reduce((s: number, c: any) => s + (c.total_seats ?? 0), 0);
  return {
    id:             String(raw.id),
    name:           raw.name,
    eventDate:      raw.event_date,
    venue:          raw.venue,
    status:         mapEventStatus(raw.status),
    description:    raw.description,
    bannerUrl:      raw.banner_url,
    categories:     cats.map(mapCategory),
    minPrice:       prices.length ? Math.min(...prices) : 0,
    availableSeats: available,
    totalSeats:     total,
  };
}

// GET /catalog → event-service (via gateway, with Redis cache 5s)
export async function getCatalog(): Promise<CatalogEvent[]> {
  const res = await apiClient.get('/catalog');
  const raw = res.data;
  const list: any[] = Array.isArray(raw) ? raw : (raw?.data ?? []);
  return list.map(mapCatalogItem);
}

// GET /events/:id → event-service
export async function getEvent(eventId: string): Promise<Event> {
  const res = await apiClient.get(`/events/${eventId}`);
  const raw = res.data;
  return {
    id:          String(raw.id),
    name:        raw.name,
    eventDate:   raw.event_date,
    venue:       raw.venue,
    status:      mapEventStatus(raw.status),
    description: raw.description,
    bannerUrl:   raw.banner_url,
  };
}

// GET /events/:id/seats → event-service
// Response: { event_id, event_name, categories: [...] }
export async function getEventSeats(eventId: string): Promise<SeatCategory[]> {
  const res = await apiClient.get(`/events/${eventId}/seats`);
  const raw = res.data;
  const cats: any[] = raw?.categories ?? (Array.isArray(raw) ? raw : []);
  return cats.map(mapCategory);
}

// GET /erp/analytics/events/:id → erp-service M4
// Sekarang lewat API Gateway (/erp → :3005) sesuai arsitektur
export async function getErpEventAnalytics(eventId: string): Promise<ErpAnalytics> {
  const res = await apiClient.get<ErpAnalytics>(`/erp/analytics/events/${eventId}`);
  return res.data;
}

