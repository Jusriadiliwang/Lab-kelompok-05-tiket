/**
 * k6 Load Test Script — War Tiket Konser
 * =========================================
 * Penulis   : Marhepi Rahmadani (105841109523)
 * Co-Author : Ashabul Kahfi (105841108523)
 * Kelompok  : 5 — Praktikum Microservices
 * Universitas: Muhammadiyah Makassar
 *
 * Skenario:
 *   1. Warmup      : 10 VU, 30 detik   (pastikan service stabil)
 *   2. Ramp-up     : 10→50 VU, 1 menit (simulasi lonjakan traffic)
 *   3. Peak (War)  : 50 VU, 2 menit    (simulasi war tiket — concurrent tinggi)
 *   4. Ramp-down   : 50→0 VU, 30 detik
 *
 * Endpoint yang diuji:
 *   - GET  /catalog               → event-service (via gateway, Redis cache)
 *   - GET  /events/:id/seats      → ketersediaan kursi real-time
 *   - POST /orders                → lock kursi (Redis NX EX — anti oversell)
 *   - POST /payments              → proses pembayaran (trigger Saga)
 *
 * Cara jalankan:
 *   k6 run load-test/script.js
 *   k6 run --out json=load-test/result.json load-test/script.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// ── Custom Metrics ──────────────────────────────────────────────
const catalogErrors    = new Counter('catalog_errors');
const lockErrors       = new Counter('lock_errors');
const paymentErrors    = new Counter('payment_errors');
const lockSuccessRate  = new Rate('lock_success_rate');
const catalogDuration  = new Trend('catalog_duration', true);
const lockDuration     = new Trend('lock_duration', true);
const paymentDuration  = new Trend('payment_duration', true);

// ── Konfigurasi ─────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Event ID & seat category yang tersedia di seed data
const EVENTS = [
  { eventId: '1', seatCategoryId: '3' },  // Konser Dewa 19 - Festival
  { eventId: '2', seatCategoryId: '6' },  // Blackpink - Festival
  { eventId: '3', seatCategoryId: '9' },  // Slipknot - Festival
];

// ── Stage (Skenario Load Test) ──────────────────────────────────
export const options = {
  stages: [
    { duration: '30s', target: 10  },  // Warmup
    { duration: '60s', target: 50  },  // Ramp-up → simulasi war tiket dimulai
    { duration: '120s', target: 50 },  // Peak — 50 concurrent user berebut kursi
    { duration: '30s', target: 0   },  // Ramp-down
  ],
  thresholds: {
    // GET /catalog harus < 200ms di p95
    'catalog_duration': ['p(95)<200'],
    // POST /orders harus < 500ms di p95
    'lock_duration': ['p(95)<500'],
    // Rate error harus < 5%
    'http_req_failed': ['rate<0.05'],
    // Lock success rate > 0% (beberapa 409 wajar karena anti-oversell)
    'lock_success_rate': ['rate>0'],
  },
};

// ── Helper: Get JWT Token ───────────────────────────────────────
function getToken(userId) {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ userId }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  if (res.status === 200) {
    return res.json('token');
  }
  // Fallback: gunakan /auth/token (dev endpoint)
  const devRes = http.post(
    `${BASE_URL}/auth/token`,
    JSON.stringify({ userId, role: 'user' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  return devRes.json('token');
}

// ── Main Virtual User Function ──────────────────────────────────
export default function () {
  // Setiap VU punya userId unik
  const vuId   = `loadtest_user_${__VU}_${__ITER}`;
  const token  = getToken(vuId);
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-Correlation-ID': `lt-${__VU}-${__ITER}-${Date.now()}`,
    'X-Client': 'k6-load-test',
  };

  // Pilih event secara acak
  const event = EVENTS[Math.floor(Math.random() * EVENTS.length)];

  // ── Grup 1: Browse Catalog ────────────────────────────────────
  group('1. GET /catalog', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/catalog`, { headers });
    catalogDuration.add(Date.now() - start);

    const ok = check(res, {
      'catalog status 200':     (r) => r.status === 200,
      'catalog has data':       (r) => {
        try {
          const body = r.json();
          return (Array.isArray(body) && body.length > 0) ||
                 (body.data && body.data.length > 0);
        } catch { return false; }
      },
      'catalog latency < 200ms': (r) => r.timings.duration < 200,
    });
    if (!ok) catalogErrors.add(1);
  });

  sleep(0.5);

  // ── Grup 2: Lihat Ketersediaan Kursi ─────────────────────────
  group('2. GET /events/:id/seats', () => {
    const res = http.get(`${BASE_URL}/events/${event.eventId}/seats`, { headers });
    check(res, {
      'seats status 200': (r) => r.status === 200,
      'seats has categories': (r) => {
        try {
          const body = r.json();
          return body.categories && body.categories.length > 0;
        } catch { return false; }
      },
    });
  });

  sleep(0.3);

  // ── Grup 3: Lock Kursi (War Tiket!) ──────────────────────────
  // Ini adalah titik panas — ribuan user berebut kursi bersamaan
  let reservationId = null;
  group('3. POST /orders — Lock Kursi (Redis NX EX)', () => {
    const start = Date.now();
    const res = http.post(
      `${BASE_URL}/orders`,
      JSON.stringify({
        event_id:         parseInt(event.eventId),
        seat_category_id: parseInt(event.seatCategoryId),
        user_id:          vuId,
      }),
      { headers }
    );
    lockDuration.add(Date.now() - start);

    const locked = check(res, {
      'lock status 201 (menang)':      (r) => r.status === 201,
      'lock status 409 (kalah — wajar)': (r) => r.status === 409,
      'lock not 500':                  (r) => r.status !== 500,
      'lock latency < 500ms':          (r) => r.timings.duration < 500,
    });

    if (res.status === 201) {
      lockSuccessRate.add(1);
      try { reservationId = res.json('id') || res.json('reservationId'); } catch {}
    } else if (res.status === 409) {
      // 409 Conflict = anti-oversell bekerja — ini bukan error
      lockSuccessRate.add(0);
    } else {
      lockErrors.add(1);
      lockSuccessRate.add(0);
    }
  });

  sleep(1);

  // ── Grup 4: Bayar (hanya jika lock berhasil) ─────────────────
  if (reservationId) {
    group('4. POST /payments — Bayar', () => {
      const start = Date.now();
      const methods = ['bank_transfer', 'credit_card', 'gopay', 'ovo', 'dana'];
      const method  = methods[Math.floor(Math.random() * methods.length)];

      const res = http.post(
        `${BASE_URL}/payments`,
        JSON.stringify({
          order_id: reservationId,
          user_id:  vuId,
          method,
        }),
        { headers }
      );
      paymentDuration.add(Date.now() - start);

      const ok = check(res, {
        'payment status 201':    (r) => r.status === 201,
        'payment not 500':       (r) => r.status !== 500,
        'payment has message':   (r) => {
          try { return !!r.json('message'); } catch { return false; }
        },
        'payment latency < 1s':  (r) => r.timings.duration < 1000,
      });
      if (!ok && res.status !== 409) paymentErrors.add(1);
    });
  }

  sleep(Math.random() * 2 + 1); // Jeda acak 1-3 detik antar iterasi
}

// ── Teardown: ringkasan ─────────────────────────────────────────
export function handleSummary(data) {
  return {
    'load-test/result-summary.json': JSON.stringify(data, null, 2),
  };
}
