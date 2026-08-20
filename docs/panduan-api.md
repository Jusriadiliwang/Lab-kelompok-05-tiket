# Panduan API — War Tiket Konser

**Penulis:** Marhepi Rahmadani (105841109523)  
**Co-Author:** Ashabul Kahfi (105841108523)  
**Kelompok:** 5 | Praktikum Microservices  
**Universitas:** Muhammadiyah Makassar  
**Base URL:** `http://localhost:3000` (API Gateway)  
**Versi:** 2.0  

---

## Daftar Isi

1. [Gambaran Umum](#1-gambaran-umum)
2. [Authentication](#2-authentication)
3. [Event & Catalog API](#3-event--catalog-api)
4. [Ticket API — Lock Kursi](#4-ticket-api--lock-kursi)
5. [Payment API — Pembayaran](#5-payment-api--pembayaran)
6. [Notification API](#6-notification-api)
7. [ERP Analytics API](#7-erp-analytics-api)
8. [Error Codes](#8-error-codes)
9. [Contoh Alur Lengkap](#9-contoh-alur-lengkap)

---

## 1. Gambaran Umum

Semua request client **wajib** melalui **API Gateway** di port `3000`. Gateway menangani:

- ✅ **JWT Authentication** — setiap request terproteksi butuh header `Authorization: Bearer <token>`
- ✅ **Rate Limiting** — `POST /orders`: 10 req/10s · default: 100 req/60s (ADR-005)
- ✅ **Redis Cache** — `GET /catalog` di-cache 5 detik (proteksi DB saat lonjakan)
- ✅ **Correlation ID** — setiap request di-inject `X-Correlation-ID` untuk distributed tracing

### Diagram Routing

```
Client
  └── POST  /auth/register  → api-gateway (buat user)
  └── POST  /auth/login     → api-gateway (login)
  └── GET   /catalog        → event-service :3001 (+ Redis cache)
  └── GET   /events/*       → event-service :3001
  └── POST  /orders         → ticket-service :3002 (Redis NX EX lock)
  └── GET   /orders/*       → ticket-service :3002
  └── POST  /payments       → payment-service :3003
  └── GET   /payments/*     → payment-service :3003
  └── GET   /notifications/ → notification-service :3004
  └── GET   /erp/analytics/ → erp-service :3005
```

### Headers Wajib

| Header | Nilai | Keterangan |
|---|---|---|
| `Content-Type` | `application/json` | Semua request body JSON |
| `Authorization` | `Bearer <jwt_token>` | Wajib untuk semua endpoint terproteksi |
| `X-Correlation-ID` | UUID v4 | Opsional, auto-inject oleh gateway |

---

## 2. Authentication

### 2.1 Daftar User Baru

**`POST /auth/register`** — Public (tidak perlu token)

**Request Body:**
```json
{
  "userId": "budi_santoso",
  "name": "Budi Santoso",
  "email": "budi@email.com"
}
```

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `userId` | string | ✅ | Min 3 karakter, hanya huruf/angka/underscore |
| `name` | string | ✅ | Min 2 karakter, nama lengkap |
| `email` | string | ❌ | Opsional |

**Response `201 Created`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "budi_santoso",
  "name": "Budi Santoso",
  "role": "user",
  "message": "Selamat datang, Budi Santoso! Akun berhasil dibuat."
}
```

**Response `409 Conflict`:**
```json
{
  "error": "user_exists",
  "message": "User ID 'budi_santoso' sudah terdaftar."
}
```

---

### 2.2 Login

**`POST /auth/login`** — Public (tidak perlu token)

**Request Body:**
```json
{
  "userId": "budi_santoso"
}
```

**Response `200 OK`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "budi_santoso",
  "name": "Budi Santoso",
  "role": "user",
  "message": "Selamat datang kembali, Budi Santoso!"
}
```

> **Catatan:** Token valid selama **24 jam**. Simpan token dan sertakan di setiap request selanjutnya.

---

## 3. Event & Catalog API

### 3.1 Ambil Semua Event

**`GET /catalog`** — Public

> ⚡ Di-cache Redis 5 detik — request pertama hit DB, selanjutnya dari cache.

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Konser Dewa 19 Reuni",
      "venue": "Gelora Bung Karno, Jakarta",
      "event_date": "2026-09-20T19:00:00.000Z",
      "description": "Reuni legenda rock Indonesia...",
      "banner_url": "https://images.unsplash.com/...",
      "status": "on_sale",
      "categories": [
        { "id": 1, "name": "VVIP", "total_seats": 200, "available_seats": 198, "price": "2500000.00" },
        { "id": 2, "name": "VIP",  "total_seats": 500, "available_seats": 497, "price": "750000.00" },
        { "id": 3, "name": "Festival", "total_seats": 5000, "available_seats": 4990, "price": "350000.00" }
      ]
    }
  ]
}
```

---

### 3.2 Detail Event

**`GET /events/:id`** — Public

**Contoh:** `GET /events/1`

**Response `200 OK`:**
```json
{
  "id": 1,
  "name": "Konser Dewa 19 Reuni",
  "venue": "Gelora Bung Karno, Jakarta",
  "event_date": "2026-09-20T19:00:00.000Z",
  "status": "on_sale"
}
```

---

### 3.3 Ketersediaan Kursi

**`GET /events/:id/seats`** — Public

**Contoh:** `GET /events/1/seats`

**Response `200 OK`:**
```json
{
  "event_id": 1,
  "event_name": "Konser Dewa 19 Reuni",
  "categories": [
    {
      "id": 3,
      "name": "Festival",
      "total_seats": 5000,
      "available_seats": 4990,
      "price": "350000.00"
    }
  ]
}
```

---

## 4. Ticket API — Lock Kursi

### 4.1 Lock Kursi (POST /orders)

**`POST /orders`** — 🔐 Butuh Auth

> ⚡ **Inti anti-oversell** — menggunakan Redis `SET NX EX` sebagai distributed lock.  
> Rate-limit: **10 request per 10 detik** per user (ADR-005).

**Request Body:**
```json
{
  "event_id": 1,
  "seat_category_id": 3,
  "user_id": "budi_santoso"
}
```

| Field | Tipe | Keterangan |
|---|---|---|
| `event_id` | integer | ID event dari `/catalog` |
| `seat_category_id` | integer | ID kategori kursi dari `/events/:id/seats` |
| `user_id` | string | User ID yang login |

**Response `201 Created` (Berhasil lock):**
```json
{
  "id": 25,
  "user_id": "budi_santoso",
  "event_id": 1,
  "seat_category_id": 3,
  "event_name": "Konser Dewa 19 Reuni",
  "seat_category_name": "Festival",
  "price": "350000.00",
  "status": "locked",
  "lock_expires_at": "2026-08-20T14:30:00.000Z",
  "message": "Kursi dikunci selama 15 menit. Segera bayar sebelum kedaluwarsa."
}
```

**Response `409 Conflict` (Kursi sudah dikunci orang lain):**
```json
{
  "error": "seat_locked",
  "message": "Kursi Festival sudah dipesan user lain. Pilih kategori lain."
}
```

**Response `429 Too Many Requests` (Rate limit):**
```json
{
  "error": "too_many_requests",
  "message": "Rate limit terlampaui. Maksimal 10 request per 10 detik.",
  "retryAfter": 10
}
```

---

### 4.2 Cek Status Reservasi

**`GET /orders/:id`** — 🔐 Butuh Auth

**Contoh:** `GET /orders/25`

**Response `200 OK`:**
```json
{
  "id": 25,
  "status": "locked",
  "lock_expires_at": "2026-08-20T14:30:00.000Z",
  "seat_category_name": "Festival",
  "price": "350000.00"
}
```

**Status yang mungkin:**

| Status | Keterangan |
|---|---|
| `locked` | Kursi dikunci, menunggu pembayaran (≤15 menit) |
| `confirmed` | Pembayaran berhasil, tiket aktif |
| `expired` | Waktu pembayaran habis, kursi dilepas otomatis |
| `cancelled` | Dibatalkan manual |

---

### 4.3 Lepas Lock Manual

**`DELETE /orders/:id`** — 🔐 Butuh Auth

**Response `200 OK`:**
```json
{
  "message": "Reservasi dibatalkan. Kursi sudah dilepas."
}
```

---

### 4.4 Daftar Pesanan User

**`GET /orders?user_id=:userId`** — 🔐 Butuh Auth

**Contoh:** `GET /orders?user_id=budi_santoso`

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": 25,
      "event_name": "Konser Dewa 19 Reuni",
      "seat_category_name": "Festival",
      "price": "350000.00",
      "status": "confirmed",
      "created_at": "2026-08-20T13:00:00.000Z"
    }
  ]
}
```

---

## 5. Payment API — Pembayaran

### 5.1 Proses Pembayaran

**`POST /payments`** — 🔐 Butuh Auth

> ⚡ Setelah sukses, men-trigger **Saga Choreography** via RabbitMQ:  
> `payment.confirmed` → ticket-service → `ticket.confirmed` → notification-service

**Request Body:**
```json
{
  "order_id": 25,
  "user_id": "budi_santoso",
  "method": "gopay"
}
```

**Method pembayaran yang tersedia:**

| Method | Keterangan |
|---|---|
| `bank_transfer` | Transfer bank (BCA, BNI, Mandiri, BRI) |
| `credit_card` | Kartu kredit/debit (Visa, Mastercard) |
| `gopay` | Dompet digital GoPay |
| `ovo` | Dompet digital OVO |
| `dana` | Dompet digital DANA |

**Response `201 Created`:**
```json
{
  "id": 15,
  "order_id": 25,
  "user_id": "budi_santoso",
  "amount": "350000.00",
  "method": "gopay",
  "status": "success",
  "paid_at": "2026-08-20T13:05:00.000Z",
  "message": "Pembayaran berhasil! E-tiket akan segera dikirim."
}
```

**Response `409 Conflict` (Pembayaran duplikat):**
```json
{
  "error": "duplicate_payment",
  "message": "Pembayaran untuk order ini sudah ada."
}
```

---

### 5.2 Cek Status Pembayaran

**`GET /payments/:id`** — 🔐 Butuh Auth

**Response `200 OK`:**
```json
{
  "id": 15,
  "status": "success",
  "paid_at": "2026-08-20T13:05:00.000Z",
  "method": "gopay",
  "amount": "350000.00"
}
```

---

### 5.3 Cancel / Refund

**`POST /payments/:id/cancel`** — 🔐 Butuh Auth

**Response `200 OK`:**
```json
{
  "message": "Refund sedang diproses."
}
```

---

## 6. Notification API

### 6.1 Ambil Notifikasi User

**`GET /notifications/:userId`** — 🔐 Butuh Auth

**Contoh:** `GET /notifications/budi_santoso`

**Response `200 OK`:**
```json
[
  {
    "id": 1,
    "user_id": "budi_santoso",
    "type": "ETICKET",
    "channel": "EMAIL",
    "status": "SENT",
    "payload": {
      "event_name": "Konser Dewa 19 Reuni",
      "seat_category": "Festival",
      "qr_code": "data:image/png;base64,..."
    },
    "sent_at": "2026-08-20T13:06:00.000Z"
  }
]
```

**Tipe notifikasi:**

| Tipe | Trigger |
|---|---|
| `ETICKET` | Setelah `ticket.confirmed` (pembayaran berhasil) |
| `REMINDER` | H-1 sebelum event |
| `FAILED_PAYMENT` | Setelah `payment.failed` |

---

## 7. ERP Analytics API

### 7.1 Statistik Event (Live)

**`GET /erp/analytics/events/:id`** — 🔐 Butuh Auth

> Data langsung dari ERP service (M4 Analytics) via API Gateway.

**Response `200 OK`:**
```json
{
  "eventId": "1",
  "eventName": "Konser Dewa 19 Reuni",
  "totalSeats": 5700,
  "ticketsSold": 710,
  "ticketsLocked": 5,
  "ticketsExpired": 50,
  "ticketsAvailable": 4935,
  "conversionRate": 12.45,
  "grossRevenue": 497000000
}
```

---

## 8. Error Codes

| HTTP Code | Error | Keterangan |
|---|---|---|
| `400` | `bad_request` | Request body tidak valid atau field wajib kosong |
| `401` | `unauthorized` | Token tidak ada, tidak valid, atau kedaluwarsa |
| `403` | `forbidden` | Token valid tapi tidak punya hak akses |
| `404` | `not_found` | Resource tidak ditemukan |
| `409` | `conflict` | Duplikat resource (kursi sudah dikunci, payment sudah ada) |
| `429` | `too_many_requests` | Rate limit terlampaui |
| `500` | `internal_error` | Error server — lihat log |
| `502` | `bad_gateway` | Service downstream tidak dapat dihubungi |

### Format Error Response

```json
{
  "error": "error_code",
  "message": "Pesan yang bisa dibaca manusia",
  "correlationId": "uuid-untuk-tracing"
}
```

---

## 9. Contoh Alur Lengkap

Alur lengkap dari register hingga mendapat e-ticket:

```bash
# 1. Daftar user baru
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"userId": "budi_test", "name": "Budi Test"}'
# Simpan token dari response

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 2. Browse event
curl http://localhost:3000/catalog

# 3. Lihat ketersediaan kursi event id=1
curl http://localhost:3000/events/1/seats

# 4. Lock kursi (War Tiket!)
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"event_id": 1, "seat_category_id": 3, "user_id": "budi_test"}'
# Simpan id dari response (misal: 26)

ORDER_ID=26

# 5. Bayar
curl -X POST http://localhost:3000/payments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"order_id": 26, "user_id": "budi_test", "method": "gopay"}'

# 6. Cek status pesanan (poll hingga status=confirmed)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/orders/$ORDER_ID

# 7. Cek notifikasi (e-ticket)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/notifications/budi_test
```

---

## Catatan Penting

> **Anti-Oversell:** `POST /orders` menggunakan Redis `SET NX EX` yang bersifat **atomic**. Hanya satu request yang bisa berhasil pada kursi yang sama, meskipun ribuan request datang bersamaan.

> **Saga Pattern:** Setelah `POST /payments` berhasil, sistem menggunakan **Choreography-based Saga** via RabbitMQ — tidak ada distributed transaction, tapi setiap service bereaksi terhadap event.

> **Rate Limit:** Jika mendapat HTTP 429, tunggu sesuai nilai `retryAfter` (dalam detik) sebelum mencoba lagi.

---

*Dokumen ini merupakan bagian dari laporan praktikum Microservices Kelompok 5 — Universitas Muhammadiyah Makassar.*
