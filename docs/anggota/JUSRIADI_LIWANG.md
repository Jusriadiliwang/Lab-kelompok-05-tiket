# 📄 Dokumentasi Kontribusi Individu
## Jusriadi Liwang — Data & Persistence Engineer + Frontend Developer
**NIM:** 105841117023  
**Kelompok:** 5 | Praktikum Microservices  
**Universitas:** Muhammadiyah Makassar  
**Repository:** https://github.com/Jusriadiliwang/Lab-kelompok-05-tiket

---

## 👤 Profil Peran

| Atribut | Detail |
|---|---|
| **Peran Utama** | Data & Persistence Engineer, Frontend Developer |
| **Tanggung Jawab** | Database design, seed data, skema PostgreSQL, frontend SPA, deployment |
| **Total Commit** | 7+ commit sebagai author utama |
| **Stack** | PostgreSQL, SQL, HTML/CSS/JavaScript, Nginx, Docker, GitHub Pages |

---

## 🏗️ Kontribusi Teknis

### 1. Fondasi Sistem — Initial Setup

Membangun **seluruh kerangka awal** dari 4 microservice dari nol:

```
event-service/          ticket-service/
payment-service/        notification-service/
├── src/
│   ├── index.js        ← Express server entry point
│   ├── db.js           ← PostgreSQL connection pool
│   └── routes/
│       └── *.js        ← REST endpoint per resource
├── Dockerfile
└── package.json
```

- Membuat `docker-compose.yml` lengkap:
  - 4 PostgreSQL database terpisah (`event_db`, `ticket_db`, `payment_db`, `notification_db`)
  - Redis (lock store + cache)
  - RabbitMQ (message broker)
  - Healthcheck untuk setiap container
  - Network `tiket-net` yang menghubungkan semua service
- Membuat `openapi.yaml` v1 (563 baris) mendokumentasikan semua endpoint awal

---

### 2. Desain Database & Skema PostgreSQL

Merancang dan mengimplementasikan skema database untuk **seluruh sistem**:

#### event-service — `event_init.sql`

```sql
-- Tabel utama
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    event_date TIMESTAMPTZ NOT NULL,
    venue VARCHAR(255),
    status VARCHAR(20) DEFAULT 'DRAFT'  -- DRAFT | PUBLISHED | CANCELLED
);

CREATE TABLE seat_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id),
    name VARCHAR(50),    -- VIP | REGULER | FESTIVAL
    total_seats INTEGER,
    price DECIMAL(12,2)
);

CREATE TABLE seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES seat_categories(id),
    seat_code VARCHAR(10)  -- A1, B12, ...
);
```

**Seed data:** 3 konser + 5 event dengan jadwal, venue, dan kategori kursi nyata.

#### ticket-service — `ticket_init.sql`

```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    seat_id UUID,
    event_id UUID,
    status VARCHAR(20) DEFAULT 'PENDING',
    -- PENDING | CONFIRMED | EXPIRED | CANCELLED
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    seat_id UUID,
    qr_code TEXT,
    issued_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partial UNIQUE index: satu kursi hanya boleh ada satu tiket aktif
CREATE UNIQUE INDEX idx_seat_confirmed
ON tickets (seat_id)
WHERE status = 'CONFIRMED';
```

**Seed data:** 10 orders (semua status), 6 tickets dengan QR code.

#### payment-service — `payment_init.sql`

```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID,
    user_id UUID,
    amount DECIMAL(12,2),
    status VARCHAR(20) DEFAULT 'PENDING',
    -- PENDING | PAID | FAILED | REFUNDED
    payment_method VARCHAR(50),
    paid_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);

CREATE TABLE payment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(id),
    event_type VARCHAR(30),  -- INITIATED | CALLBACK | TIMEOUT
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Seed data:** 7 payments mencakup semua status (PAID, FAILED, REFUNDED, PENDING).

#### notification-service — `notification_init.sql`

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    type VARCHAR(30),     -- ETICKET | REMINDER | FAILED_PAYMENT
    channel VARCHAR(10),  -- EMAIL | PUSH
    status VARCHAR(10) DEFAULT 'QUEUED',  -- QUEUED | SENT | FAILED
    payload JSONB,
    sent_at TIMESTAMPTZ
);
```

---

### 3. Perbaikan & Hardening Skema

Setelah sistem berjalan, melakukan perbaikan skema untuk ketahanan:

| Perbaikan | Detail |
|---|---|
| **Partial UNIQUE index** | `CREATE UNIQUE INDEX ... WHERE status = 'CONFIRMED'` — mencegah oversell di level DB |
| **`updated_at` tracking** | Trigger otomatis update timestamp saat row diubah |
| **Constraint diperluas** | `CHECK` constraint pada kolom status untuk validasi nilai valid |
| **Sinkronisasi openapi.yaml** | Fix v1 → sinkron dengan schema DB terbaru |

---

### 4. Frontend — Single Page Application (91KB+)

Membangun seluruh tampilan `frontend/index.html` — **SPA lengkap tanpa framework**:

#### Fitur Utama

**Hero Carousel:**
- Menampilkan 3 event featured dari database
- Auto-slide dengan transisi smooth
- Badge "ON SALE NOW" dengan countdown timer

**Event Grid & Discovery:**
- Filter kategori: Semua · Konser · Festival · Sport · Theater · Comedy
- Search real-time by nama event, artis, venue
- Card event dengan gambar, tanggal, harga

**Modal Detail & Pembelian:**
- Detail konser lengkap (lineup, venue, jadwal)
- Pilih kategori kursi (VIP / Reguler / Festival)
- Countdown timer 15 menit saat kursi dikunci
- Integrasi `POST /api/orders` via API Gateway

**Autentikasi:**
- Form login (User ID)
- Persistent session via `localStorage`
- Logout dengan cleanup state

**Halaman "Pesanan Saya":**
- Daftar semua order user yang login
- Status badge (PENDING / CONFIRMED / EXPIRED)
- QR code e-ticket untuk order CONFIRMED

#### Admin Panel (Tersembunyi)

Klik logo 5× untuk membuka panel admin:

| Fitur Admin | Detail |
|---|---|
| **Dashboard Event** | Statistik: total event, total tiket terjual, revenue |
| **Buat Event** | Form lengkap dengan upload banner gambar |
| **Galeri Gambar** | Upload drag & drop, preview, delete gambar |
| **Kelola Order** | Tabel semua order dengan filter dan detail |

**Persistensi:**
- Banner & status event tersimpan di `localStorage` — tidak hilang saat refresh
- Preferensi filter kategori tersimpan

---

### 5. Deployment — GitHub Pages

Mengatur **deployment otomatis** ke GitHub Pages:

```
docs/
├── index.html      ← Copy frontend untuk GitHub Pages
└── ...             ← Dokumentasi arsitektur
```

- URL live: https://jusriadiliwang.github.io/Lab-kelompok-05-tiket/
- Konfigurasi repository GitHub Pages → branch `main`, folder `/docs`
- Frontend dapat diakses publik tanpa server

---

### 6. Docker Compose — Infrastruktur Lengkap

`docker-compose.yml` yang dibuat mencakup:

```yaml
services:
  # Infrastructure
  postgres-event:       # PostgreSQL event_db
  postgres-ticket:      # PostgreSQL ticket_db
  postgres-payment:     # PostgreSQL payment_db
  postgres-notification:# PostgreSQL notification_db
  postgres-erp:         # PostgreSQL erp_db
  redis:                # Redis 7 (lock + cache)
  rabbitmq:             # RabbitMQ 3.12 + management UI

  # Microservices
  event-service:        # :3001
  ticket-service:       # :3002
  payment-service:      # :3003
  notification-service: # :3004
  api-gateway:          # :3000
  erp-service:          # :3005

  # Frontend
  frontend:             # Nginx :8080
```

**Setiap database service dilengkapi:**
- `healthcheck` dengan `pg_isready`
- Volume persistent data
- Mount SQL init script

---

## 🗃️ Statistik Commit

| Kategori | Detail |
|---|---|
| Total commit | **7+ commit** sebagai author utama |
| File utama | `frontend/index.html`, `db-init/*.sql`, `docker-compose.yml`, `openapi.yaml` v1 |

**Commit utama:**
- `init: scaffold all 4 microservices + docker-compose`
- `feat: add PostgreSQL schemas and realistic seed data`
- `feat: build frontend SPA with event grid, seat picker, cart`
- `feat: add hidden admin panel (gallery, event management)`
- `fix: partial UNIQUE index, updated_at trigger, constraint hardening`
- `deploy: add docs/ folder for GitHub Pages`
- `fix: sinkronkan openapi.yaml dengan schema DB terbaru`

---

## 🔗 Referensi

| Artefak | Link / Path |
|---|---|
| Repository | https://github.com/Jusriadiliwang/Lab-kelompok-05-tiket |
| Frontend Live | https://jusriadiliwang.github.io/Lab-kelompok-05-tiket/ |
| Frontend Source | `frontend/index.html` |
| DB Init Scripts | `db-init/*.sql` |
| Docker Compose | `docker-compose.yml` |
| OpenAPI v1 | `openapi.yaml` |

---

*Dokumen ini merupakan bagian dari laporan praktikum Microservices Kelompok 5 — Universitas Muhammadiyah Makassar.*
