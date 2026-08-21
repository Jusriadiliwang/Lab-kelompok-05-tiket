import { apiClient } from './client';
import type { Notification } from '../types';

// GET /notifications/:userId → notification-service
// Sesuai arsitektur: notification-service :3004 lewat API Gateway
export async function getUserNotifications(userId: string): Promise<Notification[]> {
  const res = await apiClient.get<any>(`/notifications/${userId}`);
  const raw = res.data;
  const list: any[] = Array.isArray(raw) ? raw : (raw?.data ?? raw?.notifications ?? []);
  return list.map((n: any): Notification => ({
    id:      String(n.id),
    userId:  String(n.user_id ?? n.userId ?? ''),
    type:    (n.type?.toUpperCase() ?? 'ETICKET') as any,
    channel: (n.channel?.toUpperCase() ?? 'PUSH') as any,
    status:  (n.status?.toUpperCase() ?? 'SENT') as any,
    payload: n.payload ?? {},
    sentAt:  n.sent_at ?? n.sentAt,
  }));
}
