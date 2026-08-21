# 📄 Dokumentasi Kontribusi Individu
## Ashabul Kahfi — Backend / API Engineer
**NIM:** 105841108523  
**Kelompok:** 5 | Praktikum Microservices  
**Universitas:** Muhammadiyah Makassar  
**GitHub:** [@Kahfi10](https://github.com/Kahfi10)  
**Repository:** https://github.com/Jusriadiliwang/Lab-kelompok-05-tiket

---

## 👤 Profil Peran

| Atribut | Detail |
|---|---|
| **Peran Utama** | Backend / API Engineer |
| **Tanggung Jawab** | Logika bisnis, integrasi antar service, API Gateway, ERP Back-Office, Frontend lanjutan |
| **Total Commit** | 16+ commit sebagai author utama |
| **Stack** | Node.js, Express.js, RabbitMQ, Redis, PostgreSQL, Docker, React Native (Expo) |

---

## 🏗️ Kontribusi Berdasarkan Commit Nyata

### Microservices & Backend

| Commit | Deskripsi |
|---|---|
| `5bb915d` | `feat: add api-gateway` — JWT auth, Redis rate-limit, routing |
| `323ce0e` | `feat: implement payment confirmation and failure consumers` |
| `3176a0c` | `feat: implement payment and ticket event consumers with audit logging` |
| `13d5edf` | `feat: add ERP back-office service (M1-M6)` — RBAC, audit trail, snapshot sync |
| `c4fe027` | `fix: correct ERP seed, PostgreSQL constraint, api-gateway public routes` |
| `246b9eb` | `feat: add Redis response cache for GET /catalog (TTL 5s)` |
| `a68bc3c` | `feat(erp): implement all missing ERP features` |

### Frontend Web

| Commit | Deskripsi |
|---|---|
| `87e7e1e` | `fix(frontend): fix all bugs and integrate with ERP service` |
| `132fd2d` | `fix(frontend): fix JS syntax error — saveNewEvent must be async` |
| `bf65643` | `feat(frontend): add Tiket Saya modal with QR, Notifikasi bell+modal, fix banner URLs` |
| `987b32d` | `fix(frontend): fix all emoji issues, improve UI, fix banner images` |
| `3ed443a` | `feat(frontend): add 6 new events + 3 homepage sections` |
| `d59d63e` | `feat(frontend): add content to footer links` |

### Mobile App (Expo)

| Commit | Deskripsi |
|---|---|
| `40fbab2` | `feat: add Profile, Queue, Register screens` — auth, order management |
| `87313a9` | `Add design assets and guidelines for Monochrome Concert Pulse` |

### Dokumentasi & Laporan

| Commit | Deskripsi |
|---|---|
| `e4b10cd` | `docs: add LAPORAN.md` — laporan gabungan tiga lapisan |
| `e0f6525` | `docs: add SKRIP_VIDEO.md` — skrip narasi demo |
| `c37b6dc` | `feat: update openapi.yaml v2` + load-test.js |
| `87ec272` | `chore: remove load-test.js from repo` |
| `7619bc7` | `docs: add KONTRIBUSI.md` — dokumentasi kontribusi nyata |

---

## 📋 API Gateway (Port 3000)

| Fitur | Implementasi |
|---|---|
| **JWT Authentication** | Middleware `auth.js` — verifikasi token semua request |
| **Rate Limiting** | Redis sliding-window — `POST /orders`: 10 req/10s |
| **Response Cache** | Redis TTL 5s — `GET /catalog` |
| **Routing** | Proxy ke semua 5 service |
| **Auth Register/Login** | `POST /auth/register`, `POST /auth/login` dengan Redis user store |
| **ERP Route** | `GET /erp/*` → erp-service :3005 |

---

## ⚙️ ERP Back-Office (Port 3005) — 6 Modul

| Modul | Fungsi |
|---|---|
| M1 | Manajemen Event — CRUD, publish/cancel |
| M2 | Inventory Kursi — real-time, hold manual |
| M3 | Keuangan & Revenue — rekap, export CSV, refund |
| M4 | Analitik — conversion rate, drop-off, dashboard live |
| M5 | RBAC — login admin, kelola akun, 5 role |
| M6 | Audit Trail — immutable log semua aksi + business events |

---

## 📊 Statistik Commit

| Metrik | Nilai |
|---|---|
| Total commit (author) | **16+ commit** |
| File utama | `api-gateway/`, `erp-service/`, `consumers/`, `jobs/`, `frontend/index.html` |
| Peran tambahan | Mobile App (Expo), Frontend Web lanjutan |

---

*Dokumen ini merupakan bagian dari laporan praktikum Microservices Kelompok 5 — Universitas Muhammadiyah Makassar.*

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
