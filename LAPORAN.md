# LAPORAN GABUNGAN — War Tiket Konser
**Kelompok 5 | Praktikum Microservices | Universitas Muhammadiyah Makassar**

---

## 1. Apa yang Dirancang

### Arsitektur Sistem
Sistem War Tiket Konser dibangun dengan **6 microservice** yang terhubung via API Gateway dan message broker (RabbitMQ):

| Service | Port | Tanggung Jawab |
|---|---|---|
| `api-gateway` | 3000 | Auth (JWT), Rate-limit (Redis), Routing, Register/Login |
| `event-service` | 3001 | Kelola konser, jadwal, kategori kursi, harga |
| `ticket-service` | 3002 | Kunci kursi (Redis NX EX), konfirmasi, expire |
| `payment-service` | 3003 | Pembayaran, konfirmasi, refund |
| `notification-service` | 3004 | E-ticket, notif expire, notif gagal bayar |
| `erp-service` | 3005 | Back-office admin (M1–M6, RBAC, audit trail) |

### Lapisan Anti-Oversell (4 lapis)
```
Request masuk
  → Rate-limit Redis (api-gateway)       [fairness, anti-bot]
  → Redis cache GET /catalog (TTL 5s)   [proteksi DB dari read flood]
  → Redis SET NX EX (ticket-service)    [distributed lock, atomic]
  → PostgreSQL SELECT FOR UPDATE         [database-level guard]
  → UNIQUE constraint seat_sold         [last-resort oversell guard]
```

### Database per Service
- `event_db`, `ticket_db`, `payment_db`, `notification_db`, `erp_db` — masing-masing terpisah
- ERP tidak JOIN langsung ke DB microservice — baca via REST API + snapshot lokal
- RabbitMQ sebagai message broker untuk async communication antar service

### ERP Back-Office (6 Modul)
- **M1** Manajemen Event, **M2** Inventory Kursi, **M3** Keuangan & Revenue
- **M4** Analitik (conversion rate, drop-off), **M5** RBAC, **M6** Audit Trail immutable

### Mobile App (Expo React Native)
Aplikasi mobile dibangun dengan **Expo SDK 57 + TypeScript** sebagai client tambahan:
- Login / Register via JWT
- Browse event + filter kategori
- Lock kursi (Redis NX EX) + countdown timer
- Checkout dengan 5 metode pembayaran
- QR Code e-ticket
- Notifikasi auto-polling + Cancel order

---

## 2. Apa yang Diukur

### Load Test Real — 20 Agustus 2026 (data diambil langsung dari sistem Docker)

#### Test A & B — GET /catalog (200 req, 50 concurrent)

| Metrik | Tanpa Gateway (:3001) | Via Gateway + Redis Cache | Δ |
|---|---|---|---|
| p50 latency | 135ms | **131ms** | ↓ 3% |
| **p95 latency** | **191ms** | **167ms** | ↓ **13%** |
| p99 latency | 224ms | **200ms** | ↓ 11% |
| Avg latency | 141.9ms | **135.9ms** | ↓ 4% |
| Error rate | 0% | **0%** | — |
| Request diblokir (429) | 0 | **101 dari 200** | ✅ rate-limit aktif |

#### Test C — POST /orders: 50 Concurrent User Berebut Kursi

| Metrik | Nilai |
|---|---|
| Total request | 50 |
| p95 latency | 1138ms |
| Avg latency | 766.3ms |
| Duplikat seat (oversell) | **0** ✅ |
| Error (5xx) | **0** ✅ |

#### Test D — Rate Limit Verification (110 rapid request)

| Metrik | Nilai |
|---|---|
| HTTP 200 (diterima) | 100 |
| HTTP 429 (diblokir tepat) | **10** ✅ |
| Error rate | **0%** ✅ |

### Data Real dari PostgreSQL (query langsung setelah load test)

```
ticket_db  : 142 orders total (69 confirmed, 68 expired, 4 cancelled, 1 locked)
payment_db : 72 payments | 68 success | Revenue: Rp 133.800.000
event_db   : 30 event konser aktif | 84.051 kursi tersedia
```

### Penjelasan Angka
- **Latency turun** meskipun ada overhead gateway → Redis cache menyerap request tanpa DB query
- **101 request diblokir** = rate-limit bekerja (sliding window counter di Redis)
- **0 oversell** = Redis `SET NX EX` atomic berhasil mencegah double-booking
- **Rp 133.8jt revenue** = data nyata dari 68 transaksi sukses

---

## 3. Pengujian API (Postman)

Seluruh endpoint diuji menggunakan Postman. Screenshot bukti tersedia di `docs/api-test/`:

### Alur Pengujian End-to-End

```
1. POST /auth/login          → 200 OK + JWT token
2. POST /orders              → 201 Created, status: locked (Redis NX EX ✅)
3. POST /payments            → 201 Created, status: success (RabbitMQ Saga ✅)
4. GET  /orders/:id          → status: confirmed (Saga berhasil ✅)
5. POST /orders (duplikat)   → 409 Conflict (anti-oversell ✅)
```

| Endpoint | Status | Bukti |
|---|---|---|
| `POST /auth/login` | ✅ 200 OK | `docs/api-test/gambar/login.png` |
| `POST /orders` (lock) | ✅ 201 Created | `docs/api-test/gambar/orders.png` |
| `POST /payments` | ✅ 201 Created | `docs/api-test/gambar/payments.png` |
| `GET /orders/:id` (konfirmasi) | ✅ 200 confirmed | `docs/api-test/gambar/getorder.png` |
| `POST /orders` (anti-oversell) | ✅ 409 Conflict | `docs/api-test/gambar/oversell.png` |

---

## 4. Apa yang Dipelajari

### Teknis
1. **Redis `SET NX EX` adalah senjata utama anti-oversell** — atomic, O(1), tidak bisa ditipu concurrent request
2. **Database per service bukan hanya teori** — deployment independence nyata dirasakan saat schema evolve
3. **Rate-limit sliding window** jauh lebih fair dari fixed window untuk war tiket scenario
4. **Cache 5 detik di /catalog** mampu mengurangi DB load drastis tanpa data stale yang signifikan
5. **Saga choreography** via RabbitMQ memisahkan concern antar service — notification-service bisa down tanpa mengganggu ticketing
6. **Load test harus pakai data real** — query langsung ke PostgreSQL lebih valid dari mock response

### Non-Teknis
1. **Monorepo lebih mudah di-maintain** untuk tim kecil (2-3 orang) daripada multi-repo
2. **Docker Compose** menyederhanakan setup dev environment — `docker compose up -d` dan semua service berjalan
3. **Dokumentasi ADR (Architecture Decision Record)** membantu tim memahami MENGAPA keputusan dibuat, bukan hanya APA-nya
4. **Dokumentasi API dengan Postman** — screenshot hasil pengujian lebih meyakinkan dari kode saja

---

## 5. Referensi Artefak

| Artefak | Link |
|---|---|
| Repository | https://github.com/Jusriadiliwang/Lab-kelompok-05-tiket |
| Kontrak API (openapi.yaml) | https://github.com/Jusriadiliwang/Lab-kelompok-05-tiket/blob/main/openapi.yaml |
| Arsitektur Sistem | https://github.com/Jusriadiliwang/Lab-kelompok-05-tiket/blob/main/docs/arsitektur-war-tiket-konser.md |
| ERP & Sprint Plan | https://github.com/Jusriadiliwang/Lab-kelompok-05-tiket/blob/main/docs/struktur-erp-tasks.md |
| **Dokumentasi API + Postman** | https://github.com/Jusriadiliwang/Lab-kelompok-05-tiket/blob/main/docs/api-test/README.md |
| **Load Test Script (k6)** | https://github.com/Jusriadiliwang/Lab-kelompok-05-tiket/blob/main/load-test/script.js |
| **Hasil Load Test (data real)** | https://github.com/Jusriadiliwang/Lab-kelompok-05-tiket/blob/main/load-test/hasil-test.md |
| **Dokumentasi Individu** | https://github.com/Jusriadiliwang/Lab-kelompok-05-tiket/blob/main/docs/anggota/ |
| **Diagram Visual Arsitektur** | https://github.com/Jusriadiliwang/Lab-kelompok-05-tiket/blob/main/docs/diagrams.html |
| Frontend (GitHub Pages) | https://jusriadiliwang.github.io/Lab-kelompok-05-tiket/ |
| Docker Compose | https://github.com/Jusriadiliwang/Lab-kelompok-05-tiket/blob/main/docker-compose.yml |

---

## 6. Anggota Tim & Kontribusi

| Nama | NIM | Peran | Dokumen |
|---|---|---|---|
| Jusriadi Liwang | 105841117023 | Data & Persistence Engineer, Frontend | [JUSRIADI_LIWANG.md](docs/anggota/JUSRIADI_LIWANG.md) |
| Ashabul Kahfi | 105841108523 | Backend / API Engineer | [ASHABUL_KAHFI.md](docs/anggota/ASHABUL_KAHFI.md) |
| Miftahul Jannah | 105841116023 | Arsitek Sistem | [MIFTAHUL_JANNAH.md](docs/anggota/MIFTAHUL_JANNAH.md) |
| Marhepi Rahmadani | 105841109523 | QA, Load Test & Dokumentasi | [MARHEPI_RAHMADANI.md](docs/anggota/MARHEPI_RAHMADANI.md) |

**Kelompok 5 | Praktikum Microservices | Universitas Muhammadiyah Makassar**

---

## 1. Apa yang Dirancang

### Arsitektur Sistem
Sistem War Tiket Konser dibangun dengan **6 microservice** yang terhubung via API Gateway dan message broker (RabbitMQ):

| Service | Port | Tanggung Jawab |
|---|---|---|
| `api-gateway` | 3000 | Auth (JWT), Rate-limit (Redis), Routing |
| `event-service` | 3001 | Kelola konser, jadwal, kategori kursi, harga |
| `ticket-service` | 3002 | Kunci kursi (Redis NX EX), konfirmasi, expire |
| `payment-service` | 3003 | Pembayaran, konfirmasi, refund |
| `notification-service` | 3004 | E-ticket, notif expire, notif gagal bayar |
| `erp-service` | 3005 | Back-office admin (M1–M6, RBAC, audit trail) |

### Lapisan Anti-Oversell (4 lapis)
```
Request masuk
  → Rate-limit Redis (api-gateway)       [fairness, anti-bot]
  → Redis cache GET /catalog (TTL 5s)   [proteksi DB dari read flood]
  → Redis SET NX EX (ticket-service)    [distributed lock, atomic]
  → PostgreSQL SELECT FOR UPDATE         [database-level guard]
  → UNIQUE constraint seat_sold         [last-resort oversell guard]
```

### Database per Service
- `event_db`, `ticket_db`, `payment_db`, `notification_db`, `erp_db` — masing-masing terpisah
- ERP tidak JOIN langsung ke DB microservice — baca via REST API + snapshot lokal
- RabbitMQ sebagai message broker untuk async communication antar service

### ERP Back-Office (6 Modul)
- **M1** Manajemen Event, **M2** Inventory Kursi, **M3** Keuangan & Revenue
- **M4** Analitik (conversion rate, drop-off), **M5** RBAC, **M6** Audit Trail immutable

---

## 2. Apa yang Diukur

### Load Test — GET /catalog (200 request, 50 concurrent)

| Metrik | Sebelum (tanpa gateway) | Sesudah (via api-gateway) |
|---|---|---|
| p95 latency | 233ms | **153ms** (↓34%) |
| p99 latency | 237ms | **164ms** (↓31%) |
| Throughput | 390 req/s | **440 req/s** (↑13%) |
| Real error rate | 0% | **0%** |
| Bot diblokir | 0 req | **100 dari 200 req** |

### Penjelasan Angka
- **Latency turun** meskipun ada overhead gateway → karena Redis cache menyerap 50% request tanpa DB query
- **Throughput naik** karena response cache jauh lebih cepat dari DB query
- **100 request diblokir** = rate-limit bekerja (50 concurrent × 10s window = 100 per batch melewati limit 100/60s)
- **0% real error** = tidak ada request yang benar-benar gagal, hanya dibatasi

---

## 3. Apa yang Dipelajari

### Teknis
1. **Redis `SET NX EX` adalah senjata utama anti-oversell** — atomic, O(1), tidak bisa ditipu concurrent request
2. **Database per service bukan hanya teori** — deployment independence nyata dirasakan saat schema evolve
3. **Rate-limit sliding window** jauh lebih fair dari fixed window untuk war tiket scenario
4. **Cache 5 detik di /catalog** mampu mengurangi DB load drastis tanpa data stale yang signifikan
5. **Saga choreography** via RabbitMQ memisahkan concern antar service — notification-service bisa down tanpa mengganggu ticketing

### Non-Teknis
1. **Monorepo lebih mudah di-maintain** untuk tim kecil (2-3 orang) daripada multi-repo
2. **Docker Compose** menyederhanakan setup dev environment — `docker compose up -d` dan semua service berjalan
3. **Dokumentasi ADR (Architecture Decision Record)** membantu tim memahami MENGAPA keputusan dibuat, bukan hanya APA-nya
4. **Load test harus dilakukan dari awal**, bukan hanya di akhir — untuk validasi desain

---

## 4. Referensi Artefak

| Artefak | Link |
|---|---|
| Repository | https://github.com/Jusriadiliwang/Lab-kelompok-05-tiket |
| Kontrak API (openapi.yaml) | https://github.com/Jusriadiliwang/Lab-kelompok-05-tiket/blob/main/openapi.yaml |
| Arsitektur Sistem | https://github.com/Jusriadiliwang/Lab-kelompok-05-tiket/blob/main/docs/arsitektur-war-tiket-konser.md |
| ERP & Sprint Plan | https://github.com/Jusriadiliwang/Lab-kelompok-05-tiket/blob/main/docs/struktur-erp-tasks.md |
| Frontend (GitHub Pages) | https://jusriadiliwang.github.io/Lab-kelompok-05-tiket/ |
| Docker Compose | https://github.com/Jusriadiliwang/Lab-kelompok-05-tiket/blob/main/docker-compose.yml |

---

## 5. Anggota Tim & Kontribusi

| Nama | NIM | Peran |
|---|---|---|
| Jusriadi Liwang | 105841117023 | Data & Persistence Engineer, Frontend |
| Ashabul Kahfi | 105841108523 | Backend/API Engineer |
| Miftahul Jannah | 105841116023 | Arsitek Sistem |
| Marhepi Rahmadani | 105841109523 | Load Test & Dokumentasi |
