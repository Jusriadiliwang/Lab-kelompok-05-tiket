/**
 * API Client — War Tiket Mobile
 *
 * Semua request melalui API Gateway :3000
 * ERP analytics juga melalui API Gateway (prefix /erp)
 *
 * Routing api-gateway (src/index.js):
 *   GET  /catalog                → event-service :3001  (Redis cache 5s)
 *   /events/*                    → event-service :3001
 *   /orders/*, /tickets/*        → ticket-service :3002
 *   /payments/*                  → payment-service :3003
 *   /notifications/*             → notification-service :3004
 *   /erp/*                       → erp-service :3005
 *   /auth/token (dev only)       → api-gateway
 *
 * ADR-004: X-Correlation-ID di-inject ke setiap request untuk distributed tracing.
 * ADR-005: 429 Too Many Requests di-handle dengan pesan yang informatif.
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Gunakan IP lokal jika test di device fisik: 'http://192.168.x.x:3000'
export const API_GATEWAY_URL = 'http://localhost:3000';

// Generate UUID v4 sederhana (tidak perlu library)
function generateCorrelationId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ── API Gateway instance ──────────────────────────────────────
export const apiClient = axios.create({
  baseURL: API_GATEWAY_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Inject JWT token + X-Correlation-ID (ADR-004)
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Distributed tracing: correlation ID untuk setiap request
  config.headers['X-Correlation-ID'] = generateCorrelationId();
  config.headers['X-Client'] = 'war-tiket-mobile';
  return config;
});

// Handle errors:
// 401 → clear token (session expired)
// 429 → rate limit exceeded (ADR-005)
apiClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err.response?.status;

    if (status === 401) {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('auth_user');
    }

    if (status === 429) {
      // Sesuai ADR-005: Rate limit aktif di API Gateway
      // Beri pesan yang jelas ke user
      const retryAfter = err.response?.headers?.['retry-after'];
      const message = retryAfter
        ? `Terlalu banyak request. Coba lagi dalam ${retryAfter} detik.`
        : 'Terlalu banyak request. Tunggu sebentar lalu coba lagi.';
      err.friendlyMessage = message;
      err.isRateLimit = true;
    }

    return Promise.reject(err);
  }
);

// ── ERP client — tetap via API Gateway (bukan langsung ke :3005)
// Ini menjaga konsistensi arsitektur: semua client traffic lewat gateway
export const erpClient = apiClient;
