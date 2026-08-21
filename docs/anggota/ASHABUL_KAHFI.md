# 📄 Dokumentasi Kontribusi Individu
## Ashabul Kahfi — Backend / API Engineer
**NIM:** 105841108523  
**Kelompok:** 5 | Praktikum Microservices  
**Universitas:** Muhammadiyah Makassar  
**Repository:** https://github.com/Jusriadiliwang/Lab-kelompok-05-tiket

---

## 👤 Profil Peran

| Atribut | Detail |
|---|---|
| **Peran Utama** | Backend / API Engineer |
| **Tanggung Jawab** | Logika bisnis, integrasi antar service, API Gateway, ERP Back-Office |
| **Total Commit** | 16+ commit sebagai author utama |
| **Stack** | Node.js, Express.js, RabbitMQ, Redis, PostgreSQL, Docker |

---

## 🏗️ Kontribusi Teknis

### 1. API Gateway (Port 3000)

Membangun `api-gateway` sebagai **single entry point** — gerbang utama semua request dari client.

| Fitur | Implementasi | Detail |
|---|---|---|
| **JWT Authentication** | Middleware `auth.js` | Verifikasi token di semua request (kecuali `/health`, `/auth/login`) |
| **Rate Limiting** | Redis sliding-window | `POST /orders`: 10 req/10s · default: 100 req/60s |
| **Response Cache** | Redis TTL 5 detik | `GET /catalog` di-cache — proteksi DB saat lonjakan traffic |
| **Routing** | HTTP Proxy | Forward request ke service yang sesuai (port 3001–3004) |

```
api-gateway/
├── src/
│   ├── index.js
│   ├── middleware/
│   │   ├── auth.js          ← JWT verification
│   │   └── rateLimit.js     ← Redis sliding-window rate limiter
│   └── routes/
│       └── proxy.js         ← Routing & caching logic
├── Dockerfile
└── package.json
```

---

### 2. Endpoint REST & Business Logic

#### ticket-service (Port 3002)
| Method | Endpoint | Fungsi |
|---|---|---|
| `POST` | `/orders` | Kunci kursi dengan Redis `SET NX EX` distributed lock |
| `GET` | `/orders/:id` | Cek status reservasi |
| `DELETE` | `/orders/:id` | Lepas kunci manual |
| `GET` | `/events/:id/seats` | Ketersediaan kursi real-time |

**Mekanisme Redis Lock:**
```
SET lock:seat:{seatId} {userId} NX EX 600
  NX  = only if Not eXist → atomic, hanya 1 yang menang
  EX 600 = auto-expire 10 menit jika tidak dibayar
```

#### payment-service (Port 3003)
| Method | Endpoint | Fungsi |
|---|---|---|
| `POST` | `/payments` | Proses pembayaran + publish event ke RabbitMQ |
| `GET` | `/payments/:orderId` | Cek status pembayaran |
| `POST` | `/payments/:orderId/cancel` | Cancel & refund |

#### notification-service (Port 3004)
| Method | Endpoint | Fungsi |
|---|---|---|
| `GET` | `/notifications/:userId` | Ambil semua notifikasi user |

---

### 3. RabbitMQ Messaging

#### Producers

| Service | Event | Trigger |
|---|---|---|
| `ticket-service` | `ticket.locked` | Kursi berhasil dikunci |
| `ticket-service` | `ticket.confirmed` | Pembayaran dikonfirmasi |
| `ticket-service` | `ticket.expired` | Reservasi timeout 10 menit |
| `payment-service` | `payment.confirmed` | Pembayaran berhasil |
| `payment-service` | `payment.failed` | Pembayaran gagal / timeout |

#### Consumers

| Service | Event Dikonsumsi | Aksi |
|---|---|---|
| `payment-service` | `ticket.locked` | Siapkan order pembayaran |
| `ticket-service` | `payment.confirmed` | Update reservasi → CONFIRMED |
| `ticket-service` | `payment.failed` | Lepas lock, status → CANCELLED |
| `notification-service` | `ticket.confirmed` | Generate & kirim e-ticket |
| `notification-service` | `ticket.expired` | Kirim notif expired |
| `notification-service` | `payment.failed` | Kirim notif gagal bayar |
| `erp-service` | Semua event | Catat ke Audit Trail |

---

### 4. ERP Back-Office Service (Port 3005)

6 modul back-office untuk admin:

| Modul | Nama | Fungsi Utama |
|---|---|---|
| **M1** | Manajemen Event | CRUD konser, publish/cancel event |
| **M2** | Inventory Kursi | Dashboard real-time, hold manual, upload CSV |
| **M3** | Keuangan & Revenue | Rekap pendapatan, export CSV, refund manual |
| **M4** | Analitik | Conversion rate, drop-off funnel, dashboard live |
| **M5** | RBAC | Login admin, kelola akun, ganti password |
| **M6** | Audit Trail | Log immutable semua aksi admin + business event |

**RBAC Roles:** `super-admin` · `event-manager` · `finance` · `analyst` · `support`

```
erp-service/
├── src/
│   ├── routes/
│   │   ├── events.js       ← M1
│   │   ├── inventory.js    ← M2
│   │   ├── finance.js      ← M3
│   │   ├── analytics.js    ← M4
│   │   ├── admin.js        ← M5 (RBAC)
│   │   └── audit.js        ← M6
│   ├── consumers/
│   │   └── business-events.consumer.js
│   └── jobs/
│       ├── sync-erp-snapshot.job.js
│       └── generate-revenue-report.job.js
```

---

### 5. Background Jobs

| Job | Interval | Fungsi |
|---|---|---|
| `expire-reservation.job.js` | Setiap 1 menit | Expire order PENDING + lepas Redis lock |
| `expire-order.job.js` | Setiap 1 menit | Publish `payment.failed` jika order timeout |
| `sync-erp-snapshot.job.js` | Setiap 5 menit | Sync snapshot event & kursi dari event-service |
| `generate-revenue-report.job.js` | Setiap hari 00:00 | Generate rekap revenue harian |

---

### 6. Dokumentasi Teknis

- Update **`openapi.yaml` v2** — JWT security scheme, rate-limit docs, HTTP 429 response
- Menulis **`LAPORAN.md`** — laporan gabungan (desain, ukur, pelajari)
- Menulis **`SKRIP_VIDEO.md`** — skrip narasi demo end-to-end
- Menulis **`KONTRIBUSI.md`** — dokumentasi kontribusi semua anggota

---

## 📊 Hasil Load Test

Endpoint `GET /catalog` — 200 request, 50 concurrent:

| Metrik | Tanpa Gateway | Via API Gateway | Δ |
|---|---|---|---|
| p95 latency | 233ms | **153ms** | ↓ 34% |
| p99 latency | 237ms | **164ms** | ↓ 31% |
| Throughput | 390 req/s | **440 req/s** | ↑ 13% |
| Error rate | 0% | **0%** | — |
| Request diblokir rate-limit | 0 | **100 dari 200** | ✅ |

> Latency turun meski ada overhead gateway karena Redis cache menyerap 50% request tanpa DB query.

---

## 🗃️ Statistik Commit

| Kategori | Detail |
|---|---|
| Total commit | **16+ commit** sebagai author utama |
| File utama | `api-gateway/`, `erp-service/`, `consumers/`, `jobs/` |

**Commit utama:**
- `feat: add api-gateway with JWT auth, Redis rate-limit, routing`
- `feat: add ERP back-office service (M1-M6)`
- `feat: implement payment confirmation and failure consumers`
- `feat: add background jobs (expire, sync, revenue)`
- `fix: correct ERP seed, PostgreSQL constraint, api-gateway routes`
- `docs: update openapi.yaml v2 + load-test results`
- `docs: add LAPORAN.md` · `docs: add SKRIP_VIDEO.md`

---

*Dokumen ini merupakan bagian dari laporan praktikum Microservices Kelompok 5 — Universitas Muhammadiyah Makassar.*
