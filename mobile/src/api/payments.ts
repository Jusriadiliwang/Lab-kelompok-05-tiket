import { apiClient } from './client';
import type { CreatePaymentRequest, CreatePaymentResponse, Payment } from '../types';

// POST /payments → payment-service
// Body: { order_id, user_id, method }
// Response: payment object dengan message
export async function createPayment(body: CreatePaymentRequest): Promise<CreatePaymentResponse> {
  const res = await apiClient.post<any>('/payments', {
    order_id:  body.reservationId,
    user_id:   body.userId,
    method:    body.paymentMethod,
  });
  const raw = res.data;
  return {
    orderId:  String(raw.order_id ?? body.reservationId),
    message:  raw.message ?? 'Pembayaran berhasil',
  };
}

// GET /payments/:orderId → payment-service
export async function getPayment(orderId: string): Promise<Payment> {
  const res = await apiClient.get<Payment>(`/payments/${orderId}`);
  return res.data;
}

// POST /payments/:orderId/cancel → payment-service
export async function cancelPayment(orderId: string): Promise<void> {
  await apiClient.post(`/payments/${orderId}/cancel`);
}
