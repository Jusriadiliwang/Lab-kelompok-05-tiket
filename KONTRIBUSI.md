# 👥 KONTRIBUSI ANGGOTA — War Tiket Konser
**Kelompok 5 | Praktikum Microservices | Universitas Muhammadiyah Makassar**

---

## 🧑‍💻 ASHABUL KAHFI (105841108523)
### Peran: Backend / API Engineer

**Bertanggung jawab atas seluruh logika bisnis dan integrasi antar service.**

### Kontribusi Utama

#### API & Business Logic
- Mengimplementasikan endpoint REST kritis pada semua service:
  - `POST /orders` — kunci kursi dengan Redis NX EX distributed lock
  - `POST /payments` — proses pembayaran + trigger event RabbitMQ
  - `GET /catalog` — endpoint paling sering diakses, diberi Redis cache 5 detik
- Menghubungkan semua service via **RabbitMQ** (producers & consumers):
  - `ticket-service` → publish `ticket.locked`, `ticket.confirmed`, `ticket.expired`
  - `payment-service` → publish `payment.confirmed`, `payment.failed`
  - `notification-service` → consume semua event di atas
  - `erp-service` → consume semua business event untuk audit trail

#### API Gateway
- Membangun `api-gateway` (port 3000) sebagai single entry point:
  - **JWT authentication** — verifikasi token di semua request (kecuali public routes)
  - **Redis sliding-window rate limiter** — `POST /orders`: 10 req/10s, default: 100 req/60s
  - **Response cache** — `GET /catalog` di-cache Redis 5 detik (proteksi DB saat lonjakan)
  - **Routing** — forward request ke service yang sesuai

#### ERP Back-Office (M1–M6)
- Membangun `erp-service` (port 3005) dengan 6 modul lengkap:
  - **M1** Manajemen Event (CRUD, edit, publish/cancel)
  - **M2** Inventory Kursi (dashboard real-time, hold manual, upload CSV)
  - **M3** Keuangan & Revenue (rekap, export CSV, refund manual, daftar payment)
  - **M4** Analitik (conversion rate, drop-off, dashboard live)
  - **M5** RBAC (login admin, buat/update/deactivate admin, ganti password)
  - **M6** Audit Trail immutable (semua aksi admin + semua bisnis event dari RabbitMQ)

#### Background Jobs
- `expire-reservation.job.js` — setiap 1 menit: expire order + lepas Redis lock
- `expire-order.job.js` — setiap 1 menit: publish `payment.failed` jika timeout
- `sync-erp-snapshot.job.js` — setiap 5 menit: sync event/kursi dari event-service
- `generate-revenue-report.job.js` — setiap hari 00:00: rekap pendapatan

#### Dokumentasi & Laporan
- Update `openapi.yaml` ke v2 (api-gateway sebagai single server, JWT security, rate-limit docs)
- Melakukan load test (200 req, 50 concurrent) dan merekam hasilnya
- Menulis `LAPORAN.md`, `SKRIP_VIDEO.md`, `KONTRIBUSI.md`

### Statistik Commit
- **16+ commit** sebagai author utama
- File utama: semua file di `api-gateway/`, `erp-service/`, consumers, producers, jobs

---

## 🗄️ JUSRIADI LIWANG (105841117023)
### Peran: Data & Persistence Engineer

**Bertanggung jawab atas database, seed data, dan tampilan frontend.**

### Kontribusi Utama

#### Fondasi Sistem (Initial Setup)
- Membuat **semua file awal** dari 4 microservice:
  - `event-service`, `ticket-service`, `payment-service`, `notification-service`
  - Semua `src/index.js`, `src/db.js`, `src/routes/*.js`, `Dockerfile`, `package.json`
- Membuat `docker-compose.yml` lengkap dengan semua service + healthcheck
- Membuat `openapi.yaml` v1 (563 baris) yang mendokumentasikan semua endpoint

#### Database & Skema
- Merancang skema PostgreSQL untuk semua service:
  - `event_init.sql` — tabel `events`, `seat_categories`, `seats` + seed 3 konser + 5 event
  - `ticket_init.sql` — tabel `orders`, `tickets` + seed 10 orders, 6 tickets
  - `payment_init.sql` — tabel `payments` + seed 7 payments semua status
  - `notification_init.sql` — tabel `notifications`
- Seed data realistis: mencakup semua status (confirmed, locked, expired, cancelled, failed, refunded)
- Perbaikan skema: partial UNIQUE index, `updated_at` tracking, constraint diperluas

#### Frontend (Web UI)
- Membangun seluruh tampilan `frontend/index.html` (91KB+ single-file SPA):
  - Hero carousel dengan 3 event real dari database
  - Event grid dengan filter kategori dan search
  - Modal detail konser + pilih kursi + countdown timer
  - Login/logout user
  - Halaman "Pesanan Saya"
- Menambahkan **Admin Panel tersembunyi** (klik logo 5x):
  - Dashboard event dengan statistik
  - Form buat event baru + upload banner
  - Galeri gambar dengan drag & drop
  - Kelola order
- Persistensi data di `localStorage` — banner & status event tidak hilang saat refresh
- Deploy ke **GitHub Pages** via folder `docs/`
- Fix `openapi.yaml` — sinkronisasi dengan schema DB terbaru

### Statistik Commit
- **7+ commit** sebagai author utama
- File utama: `frontend/index.html`, semua `db-init/*.sql`, `docker-compose.yml`, `openapi.yaml` v1

---

## 📊 MARHEPI RAHMADANI (105841109523)
### Peran: QA, Load-Test & Dokumentasi

**Bertanggung jawab atas pengujian, pengukuran performa, dan dokumentasi teknis.**

### Kontribusi Utama

#### Load Testing
- Merancang dan menjalankan load test:
  - **200 request**, 50 concurrent, endpoint `GET /catalog`
  - Mengukur p95, p99 latency, throughput, error rate
  - **Hasil:** p95 turun dari 233ms → 153ms (↓34%) setelah Redis cache diterapkan
  - **Throughput naik:** 390 → 440 req/s (↑13%)
  - **Bot diblokir:** 100 dari 200 request terkena rate-limit (fitur bekerja)
- Membuktikan bahwa angka performa bukan sekadar klaim

#### Dokumentasi
- Co-author pada commit dokumentasi arsitektur sistem
- Co-author pada `openapi.yaml` v2 (rate-limit docs, 429 response, JWT security)
- Co-author pada `LAPORAN.md` — laporan gabungan (desain, ukur, pelajari)
- Co-author pada `SKRIP_VIDEO.md` — skrip narasi demo ujung ke ujung
- Co-author pada deploy `docs/` ke GitHub Pages

#### QA & Verifikasi
- Memverifikasi bahwa sistem berjalan end-to-end dengan data real (bukan demo)
- Membuktikan flow: login → kunci kursi → bayar → tiket CONFIRMED di database
- Verifikasi data tersimpan di PostgreSQL (Order #14, QR code tersimpan)

### Commit sebagai Co-Author
| Commit | Fitur |
|---|---|
| `feat: add health checks and architecture documentation` | Arsitektur & health |
| `feat: update openapi.yaml v2 + load-test.js` | **Load test + OpenAPI** |
| `chore: remove load-test.js from repo` | Cleanup |
| `fix: sinkronkan openapi.yaml` | Dokumentasi API |
| `deploy: add docs/ folder for GitHub Pages` | Deployment |
| `docs: add LAPORAN.md` | **Laporan akhir** |
| `docs: add SKRIP_VIDEO.md` | **Skrip demo video** |

---

## 🏗️ MIFTAHUL JANNAH (105841116023)
### Peran: Arsitek Sistem

**Bertanggung jawab atas desain arsitektur dan keputusan teknis sistem.**

### Kontribusi Utama

#### Perancangan Arsitektur
- Merancang **arsitektur 6-service microservices**:
  - Mendefinisikan batas tanggung jawab setiap service
  - Menentukan pola komunikasi: sinkron (REST) vs asinkron (RabbitMQ)
  - Menetapkan prinsip **database per service** (tidak ada shared table)

#### Strategi Anti-Oversell (4 Lapis)
- Merancang 4 lapisan perlindungan yang diimplementasikan:
  1. Rate-limit di API Gateway (Redis sliding window)
  2. **Redis `SET NX EX`** sebagai distributed lock — senjata utama
  3. PostgreSQL `SELECT FOR UPDATE` — row-level lock
  4. `UNIQUE` constraint — last-resort guard

#### Architecture Decision Records (ADR)
Mendefinisikan 5 ADR yang menjadi panduan seluruh tim:
- **ADR-001**: Redis SET NX EX sebagai Distributed Lock
- **ADR-002**: Database per Service (No Shared DB)
- **ADR-003**: RabbitMQ/Kafka untuk Async Communication
- **ADR-004**: Saga Pattern (Choreography) untuk koordinasi antar service
- **ADR-005**: Rate Limiting di API Gateway

#### ERP & Dokumentasi Arsitektur
- Merancang 6 modul ERP dan ERD-nya (`ERP_EVENT_SNAPSHOT`, `AUDIT_LOG`, dll)
- Mendefinisikan RBAC: role `super-admin`, `event-manager`, `finance`, `analyst`, `support`
- Merancang sprint plan 8 minggu (Sprint 0–6)
- Merancang Saga choreography flow untuk koordinasi payment → ticket → notification

### Commit sebagai Co-Author
| Commit | Fitur |
|---|---|
| `feat: implement payment confirmation and failure consumers` | Saga pattern consumer |
| `feat: add api-gateway with JWT auth, Redis rate-limit, routing` | **API Gateway** |
| `feat: add ERP back-office service (M1-M6)` | **ERP Service** |
| `fix: correct ERP seed, PostgreSQL constraint, api-gateway routes` | Fix & hardening |

---

## 📊 Ringkasan Statistik Kontribusi

| Anggota | Commit | Peran Utama | File Kunci |
|---|---|---|---|
| Ashabul Kahfi | 16+ commit | Backend, API Gateway, ERP | `api-gateway/`, `erp-service/`, consumers, jobs |
| Jusriadi Liwang | 7+ commit | Database, Seed Data, Frontend | `frontend/index.html`, `db-init/*.sql`, `docker-compose.yml` |
| Marhepi Rahmadani | 7 co-author | Load Test, Dokumentasi | `openapi.yaml`, `LAPORAN.md`, load test results |
| Miftahul Jannah | 4 co-author | Arsitektur, ADR, ERP Design | `docs/arsitektur-*.md`, `docs/struktur-erp-tasks.md` |

## 🎯 Capaian Bersama Kelompok 5

- ✅ 6 microservice berjalan di Docker
- ✅ Anti-oversell 4 lapis (tidak ada tiket terjual 2x)
- ✅ ERP back-office lengkap (M1–M6 + RBAC + Audit Trail)
- ✅ Frontend dengan banner real, Tiket Saya, Notifikasi
- ✅ Load test terukur: p95 153ms, 440 req/s, 0% error
- ✅ OpenAPI v2 terdokumentasi lengkap
- ✅ GitHub Pages deployed
