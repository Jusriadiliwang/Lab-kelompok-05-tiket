# 📄 Dokumentasi Kontribusi Individu
## Miftahul Jannah — Arsitek Sistem
**NIM:** 105841116023  
**Kelompok:** 5 | Praktikum Microservices  
**Universitas:** Muhammadiyah Makassar  
**Repository:** https://github.com/Jusriadiliwang/Lab-kelompok-05-tiket

---

## 👤 Profil Peran

| Atribut | Detail |
|---|---|
| **Peran Utama** | System Architect |
| **Tanggung Jawab** | Desain arsitektur, ADR, ERP design, dokumentasi sistem, README, laporan |
| **Commit sebagai Author** | 4 commit README + 1 commit arsitektur utama + 1 commit load test |
| **Stack** | System Design, Mermaid, Markdown, GitHub |

---

## 🏗️ Kontribusi Berdasarkan Commit Nyata

| Commit | Deskripsi |
|---|---|
| `08a93ce` | `feat: add health checks and architecture documentation for microservices` — **arsitektur utama** (arsitektur-war-tiket-konser.md, struktur-erp-tasks.md) |
| `d8b2f1d` | `docs: add load-test script, hasil-test, dan panduan-api` |
| `b4fb3bb` | `Update README.md` |
| `6337cd5` | `Update README.md` |
| `52a7067` | `Update README.md` |

> Commit `08a93ce` awalnya atas nama Ashabul Kahfi, kemudian **diubah author menjadi Miftahul Jannah** karena dokumen arsitektur ini adalah tanggung jawab Arsitek Sistem.

---

## 🏛️ Arsitektur yang Dirancang

### 6 Service + Batas Tanggung Jawab

| Service | Port | Tanggung Jawab |
|---|---|---|
| `api-gateway` | 3000 | Auth, Rate-limit, Routing |
| `event-service` | 3001 | Konser, kursi, harga |
| `ticket-service` | 3002 | Lock kursi, konfirmasi, expire |
| `payment-service` | 3003 | Pembayaran, refund |
| `notification-service` | 3004 | E-ticket, notif expire |
| `erp-service` | 3005 | Back-office M1–M6, RBAC, Audit |

### 5 Architecture Decision Records (ADR)

| ADR | Keputusan | Status |
|---|---|---|
| ADR-001 | Redis `SET NX EX` sebagai Distributed Lock | Accepted |
| ADR-002 | Database per Service (No Shared DB) | Accepted |
| ADR-003 | RabbitMQ untuk Async Communication | Accepted |
| ADR-004 | Saga Pattern (Choreography) | Accepted |
| ADR-005 | Rate Limiting di API Gateway | Accepted |

### Strategi Anti-Oversell 4 Lapis

```
L1: Rate Limit (API Gateway)          → fairness, anti-bot
L2: Redis SET NX EX (ticket-service)  → distributed lock, atomic
L3: PostgreSQL INSERT orders           → persistence
L4: UNIQUE seat_sold constraint        → last-resort guard
```

---

## 📄 File yang Dibuat

| File | Isi |
|---|---|
| `docs/arsitektur-war-tiket-konser.md` | Diagram arsitektur, Sequence Diagram, ERD, 5 ADR, Edge Cases |
| `docs/struktur-erp-tasks.md` | ERP M1–M6 design, ERD ERP, Sprint Plan 8 minggu |
| `README.md` | Deskripsi sistem, arsitektur diagram, cara jalankan |

---

## 📊 Statistik Commit

| Metrik | Nilai |
|---|---|
| Commit sebagai author | **4+ commit** |
| File kunci | `docs/arsitektur-war-tiket-konser.md`, `docs/struktur-erp-tasks.md`, `README.md` |

---

*Dokumen ini merupakan bagian dari laporan praktikum Microservices Kelompok 5 — Universitas Muhammadiyah Makassar.*

**NIM:** 105841116023  
**Kelompok:** 5 | Praktikum Microservices  
**Universitas:** Muhammadiyah Makassar  
**Repository:** https://github.com/Jusriadiliwang/Lab-kelompok-05-tiket

---

## 👤 Profil Peran

| Atribut | Detail |
|---|---|
| **Peran Utama** | System Architect |
| **Tanggung Jawab** | Desain arsitektur, Architecture Decision Records (ADR), strategi anti-oversell, ERP design |
| **Kontribusi** | 4 commit sebagai co-author pada fitur arsitektur kritis |
| **Stack** | System Design, Mermaid, PostgreSQL ERD, RabbitMQ, Redis, Saga Pattern |

---

## 🏗️ Kontribusi Teknis

### 1. Perancangan Arsitektur 6-Service Microservices

Merancang **arsitektur keseluruhan sistem** War Tiket Konser dari nol:

#### Definisi Batas Service (Service Boundaries)

| Service | Port | Tanggung Jawab | Database | Store Tambahan |
|---|---|---|---|---|
| `api-gateway` | 3000 | Auth, Rate-limit, Routing | — | Redis |
| `event-service` | 3001 | Kelola konser, jadwal, kategori kursi | PostgreSQL | — |
| `ticket-service` | 3002 | Kunci kursi, konfirmasi, expire | PostgreSQL | Redis |
| `payment-service` | 3003 | Pembayaran, konfirmasi, refund | PostgreSQL | — |
| `notification-service` | 3004 | E-ticket, notif expire, gagal bayar | PostgreSQL | — |
| `erp-service` | 3005 | Back-office admin (M1–M6, RBAC, Audit) | PostgreSQL | — |

#### Prinsip Arsitektur yang Ditetapkan

1. **Database per Service** — Tidak ada shared table. Cross-service data hanya via REST API atau event.
2. **Sinkron hanya untuk operasi langsung** — Lock kursi, buat order → REST.
3. **Asinkron untuk operasi eventual** — Notifikasi, konfirmasi pembayaran, audit → RabbitMQ.
4. **Single Entry Point** — Semua request dari client masuk via API Gateway.

#### Diagram Arsitektur (didesain)

```
Browser / Mobile App
        │ HTTPS
        ▼
   API Gateway :3000
   (JWT auth, rate-limit, routing)
        │ REST
   ┌────┼────────────┐
   ▼    ▼            ▼
event  ticket    payment
:3001  :3002     :3003
  │      │   │     │
 PG_E  PG_T Redis PG_P
        │           │
        └─── Kafka/RabbitMQ ───┐
                               ▼
                        notification :3004
                               │
                             PG_N
```

---

### 2. Strategi Anti-Oversell 4 Lapis

Merancang **4 lapisan perlindungan berlapis** yang menjadi tulang punggung keamanan sistem:

#### Layer 1 — Rate Limit (API Gateway)
```
Teknologi: Redis sliding-window counter
Konfigurasi: POST /orders → 10 req/10s per user
Tujuan: Fairness & anti-bot (melindungi dari ribuan klik bersamaan)
```

#### Layer 2 — Redis Distributed Lock ⭐ Utama
```
Teknologi: Redis SET NX EX
Command: SET lock:seat:{seatId} {userId} NX EX 600
Tujuan: Atomic operation O(1), hanya SATU yang menang
Keunggulan: Tidak bisa ditembus concurrent request — native atomic di Redis
TTL 600s: Auto-release jika tidak bayar dalam 10 menit
```

#### Layer 3 — PostgreSQL SELECT FOR UPDATE
```
Teknologi: Row-level locking PostgreSQL
Command: SELECT * FROM seats WHERE id = $1 FOR UPDATE SKIP LOCKED
Tujuan: Database-level guard jika Redis bypass
Diaktifkan: Hanya setelah Redis lock berhasil
```

#### Layer 4 — UNIQUE Constraint (Last Resort)
```
Teknologi: PostgreSQL UNIQUE index
Schema: CREATE UNIQUE INDEX ON seat_sold(seat_id)
Tujuan: Jaminan absolut — tidak mungkin dua record untuk seat yang sama
Diaktifkan: Saat INSERT ticket setelah pembayaran confirmed
```

**Alur perlindungan:**
```
Request masuk
  → L1: Rate-limit Redis (api-gateway)          [fairness, anti-bot]
  → L2: Redis SET NX EX (ticket-service)        [distributed lock, atomic]
  → L3: PostgreSQL SELECT FOR UPDATE             [row-level guard]
  → L4: UNIQUE constraint seat_sold             [last-resort oversell guard]
```

---

### 3. Architecture Decision Records (ADR)

Mendefinisikan **5 ADR** yang menjadi panduan keputusan teknis seluruh tim:

#### ADR-001 — Redis `SET NX EX` sebagai Distributed Lock

| Aspek | Detail |
|---|---|
| **Status** | Accepted |
| **Konteks** | Ratusan ribu request bersamaan memperebutkan kursi yang sama |
| **Keputusan** | Redis atomic `SET NX EX` sebagai first-line guard |
| **Pro** | O(1) per request, atomic native, TTL otomatis |
| **Kontra** | Redis = SPOF → mitigasi: Redis Sentinel / Cluster |

#### ADR-002 — Database per Service (No Shared DB)

| Aspek | Detail |
|---|---|
| **Status** | Accepted |
| **Konteks** | 4 service dengan domain berbeda, shared DB menyebabkan deployment coupling |
| **Keputusan** | Setiap service punya PostgreSQL sendiri |
| **Pro** | Deploy independen, schema evolve sendiri |
| **Kontra** | Tidak ada distributed transaction → kompensasi dengan Saga (ADR-004) |

#### ADR-003 — RabbitMQ untuk Async Communication

| Aspek | Detail |
|---|---|
| **Status** | Accepted |
| **Konteks** | ticket-service tidak perlu menunggu email terkirim |
| **Keputusan** | RabbitMQ (fallback: Redis Streams) untuk semua event async |
| **Pro** | Services decoupled, replay events untuk audit/recovery |
| **Kontra** | Eventually consistent — user perlu polling status sebentar |

#### ADR-004 — Saga Pattern (Choreography)

| Aspek | Detail |
|---|---|
| **Status** | Accepted |
| **Konteks** | Alur 4 service: lock → bayar → konfirmasi → notif — gagal di tengah harus rollback |
| **Keputusan** | Choreography-based Saga via events (tanpa central orchestrator) |
| **Pro** | Tidak ada central orchestrator → lebih resilient |
| **Kontra** | Alur sulit di-trace → mitigasi: correlation ID + distributed tracing |

**Saga Rollback Flow:**
```
payment.failed  → ticket-service lepas lock, status CANCELLED
ticket.expired  → notification-service kirim notif ke user
```

#### ADR-005 — Rate Limiting di API Gateway

| Aspek | Detail |
|---|---|
| **Status** | Accepted |
| **Konteks** | War tiket = ribuan req/detik dari user yang sama (bot, spam klik) |
| **Keputusan** | Sliding window counter di Redis, per-user per endpoint |
| **Pro** | Melindungi backend, fairness antar user |
| **Kontra** | User koneksi buruk (retry cepat) bisa kena limit → threshold harus di-tune |

---

### 4. Desain ERP Back-Office

Merancang struktur ERP untuk back-office admin (diimplementasikan oleh Ashabul Kahfi):

#### 6 Modul ERP

| Modul | Nama | ERD Tabel |
|---|---|---|
| M1 | Manajemen Event | `ERP_EVENT_SNAPSHOT` |
| M2 | Inventory Kursi | `ERP_SEAT_SNAPSHOT` |
| M3 | Keuangan & Revenue | `ERP_REVENUE_DAILY` |
| M4 | Analitik | `ERP_FUNNEL_STATS` |
| M5 | RBAC | `ADMIN_USERS`, `ADMIN_ROLES` |
| M6 | Audit Trail | `AUDIT_LOG` (immutable) |

#### RBAC Design

```
Role: super-admin    → Akses semua modul
Role: event-manager  → M1, M2
Role: finance        → M3
Role: analyst        → M4
Role: support        → M6 (read-only)
```

#### Audit Trail Schema

```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID,          -- Admin yang melakukan aksi
    actor_role VARCHAR(30),
    action VARCHAR(50),     -- CREATE_EVENT, REFUND, LOGIN, dll
    resource VARCHAR(50),   -- event, payment, admin
    resource_id UUID,
    payload JSONB,          -- Data sebelum & sesudah
    source VARCHAR(20),     -- 'admin_action' | 'business_event'
    created_at TIMESTAMPTZ DEFAULT NOW()
    -- Tidak ada UPDATE/DELETE → immutable by design
);
```

---

### 5. Sprint Plan — 8 Minggu

Merancang rencana sprint pengembangan:

| Sprint | Minggu | Target |
|---|---|---|
| Sprint 0 | 1 | Setup repo, Docker, DB schema, ADR |
| Sprint 1 | 2 | event-service + ticket-service basic |
| Sprint 2 | 3 | payment-service + RabbitMQ integration |
| Sprint 3 | 4 | notification-service + Saga flow |
| Sprint 4 | 5 | api-gateway (JWT + rate-limit) |
| Sprint 5 | 6 | ERP back-office (M1–M4) |
| Sprint 6 | 7 | ERP RBAC (M5) + Audit Trail (M6) |
| Sprint 6+ | 8 | Load test, dokumentasi, deploy |

---

### 6. Dokumentasi Arsitektur

Menulis `docs/arsitektur-war-tiket-konser.md` — dokumen arsitektur komprehensif:

- **Section 1:** System Overview & Service Boundaries (tabel service)
- **Section 2:** Architecture Diagram (Mermaid graph)
- **Section 3:** Sequence Diagram Happy Path
- **Section 4:** Sequence Diagram Race Condition
- **Section 5:** ERD per service (4 ERD Mermaid diagram)
- **Section 6:** API Contract (REST + Kafka/RabbitMQ schema)
- **Section 7:** 5 ADR lengkap
- **Section 8:** Edge Cases & Consistency Design

Menulis `docs/struktur-erp-tasks.md` — ERP design & sprint plan.

---

## 📋 Daftar Commit Co-Author

| Commit | Fitur |
|---|---|
| `feat: implement payment confirmation and failure consumers` | Saga pattern consumer (verifikasi desain ADR-004) |
| `feat: add api-gateway with JWT auth, Redis rate-limit, routing` | **API Gateway** (implementasi ADR-001, ADR-005) |
| `feat: add ERP back-office service (M1-M6)` | **ERP Service** (implementasi desain M1–M6) |
| `fix: correct ERP seed, PostgreSQL constraint, api-gateway routes` | Fix & hardening |

---

## 🔗 Referensi

| Artefak | Link / Path |
|---|---|
| Repository | https://github.com/Jusriadiliwang/Lab-kelompok-05-tiket |
| Arsitektur Sistem | `docs/arsitektur-war-tiket-konser.md` |
| ERP & Sprint Plan | `docs/struktur-erp-tasks.md` |
| Diagram Visual | `docs/diagrams.html` |
| Laporan Gabungan | `LAPORAN.md` |

---

*Dokumen ini merupakan bagian dari laporan praktikum Microservices Kelompok 5 — Universitas Muhammadiyah Makassar.*
