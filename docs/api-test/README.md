# Dokumentasi Pengujian API — War Tiket Konser
**Penulis:** Marhepi Rahmadani (105841109523)  
**Kelompok:** 5 | Universitas Muhammadiyah Makassar  
**Tool:** Postman  
**Base URL:** `http://localhost:3000`  
**Tanggal Pengujian:** 22–25 Agustus 2026

---

## Daftar Isi
1. [Persiapan & Setup](#1-persiapan--setup)
2. [Login](#2-login)
3. [Lock Kursi — WAR TIKET!](#3-lock-kursi--war-tiket)
4. [Bayar Tiket](#4-bayar-tiket)
5. [Konfirmasi Order](#5-konfirmasi-order)
6. [Anti-Oversell 409](#6-anti-oversell-409)
7. [Register User Baru](#7-register-user-baru)
8. [Laporan Error & Penyelesaian](#8-laporan-error--penyelesaian)
9. [Ringkasan Hasil Pengujian](#9-ringkasan-hasil-pengujian)

---

## 1. Persiapan & Setup

### Prasyarat
```bash
# 1. Jalankan semua service
cd Lab-kelompok-05-tiket
docker compose up -d

# 2. Verifikasi semua container berjalan
docker compose ps
# Semua harus status: Up (healthy)
```

### Setup Postman
1. Import file: `docs/api-test/WarTiket-PostmanCollection.json`
2. Buat environment **"War Tiket Local"** dengan variable:

| Variable | Value |
|---|---|
| `base_url` | `http://localhost:3000` |
| `token` | *(kosong — diisi otomatis setelah Login)* |
| `user_id` | `user_001` |
| `order_id` | *(kosong — diisi otomatis setelah Lock Kursi)* |

3. Aktifkan environment (pojok kanan atas Postman)

> ⚠️ **Semua request (kecuali Login & Register) wajib menyertakan header:**
> ```
> Authorization: Bearer {{token}}
> ```

---

## 2. Login

Mendapatkan token JWT untuk mengakses semua endpoint terproteksi.

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `{{base_url}}/auth/login` |
| **Auth** | Tidak diperlukan |

**Body (raw JSON):**
```json
{
  "userId": "user_001"
}
```

**Tab Scripts (Tests) — auto-save token:**
```javascript
if (pm.response.code === 200) {
  const body = pm.response.json();
  pm.collectionVariables.set("token", body.token);
  pm.collectionVariables.set("user_id", body.userId);
  pm.test("Login berhasil", () => pm.expect(body.token).to.be.a("string"));
}
```

**Response sukses (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "user_001",
  "name": "user_001",
  "role": "user",
  "message": "Selamat datang kembali, user_001!"
}
```

📸 **Screenshot:**

![Login](gambar/login.png)

---

## 3. Lock Kursi — WAR TIKET!

Mengunci kursi menggunakan Redis `SET NX EX` — inti anti-oversell sistem (ADR-001).

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `{{base_url}}/orders` |
| **Auth** | `Bearer {{token}}` |

**Headers:**
| Key | Value |
|---|---|
| Authorization | `Bearer {{token}}` |
| Content-Type | `application/json` |
| X-Correlation-ID | `postman-test-001` |

**Body (raw JSON):**
```json
{
  "event_id": 1,
  "seat_category_id": 3,
  "user_id": "user_test"
}
```

**Tab Scripts (Tests) — auto-save order_id:**
```javascript
if (pm.response.code === 201) {
  const body = pm.response.json();
  pm.collectionVariables.set("order_id", body.id.toString());
  pm.test("Lock berhasil", () => pm.expect(body.status).to.equal("locked"));
  console.log("Order ID:", body.id);
}
```

**Response sukses (201 Created):**
```json
{
  "id": 110,
  "event_name": "Konser Dewa 19 Reuni",
  "seat_category_name": "Festival",
  "price": "350000.00",
  "status": "locked",
  "lock_expires_at": "2026-08-22T06:03:52.279Z",
  "message": "Kursi dikunci selama 15 menit. Segera bayar sebelum kedaluwarsa."
}
```

> 📌 Catat nilai `id` (contoh: `110`) — dipakai di Step 4 & 5.

📸 **Screenshot:**

![Lock Kursi](gambar/orders.png)

---

## 4. Bayar Tiket

Memproses pembayaran. Setelah sukses, sistem otomatis menjalankan **Saga Choreography** via RabbitMQ:
1. Publish `payment.confirmed` → **RabbitMQ**
2. `ticket-service` consume → UPDATE order `status=confirmed`
3. `notification-service` consume → kirim e-ticket ke user

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `{{base_url}}/payments` |
| **Auth** | `Bearer {{token}}` |

**Body (raw JSON):**
```json
{
  "order_id": 110,
  "user_id": "user_test",
  "method": "gopay"
}
```

> Ganti `110` dengan `id` dari Step 3.  
> Metode tersedia: `bank_transfer` · `credit_card` · `gopay` · `ovo` · `dana`

**Response sukses (201 Created):**
```json
{
  "id": 51,
  "order_id": 110,
  "amount": "350000.00",
  "method": "gopay",
  "status": "success",
  "paid_at": "2026-08-22T05:49:09.019Z",
  "message": "Pembayaran berhasil! E-tiket akan segera dikirim."
}
```

📸 **Screenshot:**

![Bayar Tiket](gambar/payments.png)

---

## 5. Konfirmasi Order

Memverifikasi status order berubah dari `locked` → `confirmed` setelah pembayaran (bukti RabbitMQ Saga berhasil dieksekusi).

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `{{base_url}}/orders/110` |
| **Auth** | `Bearer {{token}}` |

> Ganti `110` dengan `id` dari Step 3.

**Response (200 OK) — status sudah berubah:**
```json
{
  "id": 110,
  "status": "confirmed",
  "event_name": "Konser Dewa 19 Reuni",
  "seat_category_name": "Festival",
  "price": "350000.00"
}
```

📸 **Screenshot:**

![Konfirmasi Order](gambar/getorder.png)

---

## 6. Anti-Oversell 409

Membuktikan sistem mencegah double-booking — Redis `SET NX EX` hanya mengizinkan 1 user mengunci kursi yang sama pada waktu bersamaan (ADR-001).

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `{{base_url}}/orders` |
| **Auth** | `Bearer {{token}}` |

**Body — user berbeda, event & kategori SAMA:**
```json
{
  "event_id": 1,
  "seat_category_id": 3,
  "user_id": "user_lain"
}
```

**Response (409 Conflict):**
```json
{
  "error": "duplicate_order",
  "message": "Kamu sudah memiliki pesanan aktif untuk konser ini"
}
```

> ✅ **409 Conflict bukan error** — ini adalah fitur anti-oversell yang bekerja dengan benar.

📸 **Screenshot:**

![Anti-Oversell 409](gambar/oversell.png)

---

## 7. Register User Baru

Membuat akun user baru. **Berbeda dari Login** — Register membutuhkan field `name`.

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `{{base_url}}/auth/register` |
| **Auth** | Tidak diperlukan |

**Body (raw JSON) — field `name` WAJIB:**
```json
{
  "userId": "mahasiswa_demo",
  "name": "Mahasiswa Demo Unismuh",
  "email": "demo@student.unismuh.ac.id"
}
```

**Response sukses (201 Created):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "mahasiswa_demo",
  "name": "Mahasiswa Demo Unismuh",
  "role": "user",
  "message": "Selamat datang, Mahasiswa Demo Unismuh! Akun berhasil dibuat."
}
```

---

## 8. Laporan Error & Penyelesaian

Berikut adalah semua error yang ditemukan selama proses pengujian beserta penyelesaiannya.

---

### Error 1 — `400 Bad Request` pada Register

**Kapan terjadi:** Saat mencoba Register menggunakan endpoint `/auth/register` dengan body yang hanya berisi `userId` (sama seperti Login).

**Request yang salah:**
```json
{
  "userId": "user_001"
}
```

**Response error:**
```json
{
  "error": "validation_error",
  "message": "Nama wajib diisi dan minimal 2 karakter"
}
```

**Penyebab:**
- Endpoint `/auth/register` berbeda dari `/auth/login`
- Register **wajib** menyertakan field `name`

**Penyelesaian:**
```json
{
  "userId": "mahasiswa_demo",
  "name": "Mahasiswa Demo",
  "email": "demo@unismuh.ac.id"
}
```

**Status:** ✅ Terselesaikan

---

### Error 2 — `401 Unauthorized` pada POST /orders

**Kapan terjadi:** Saat mencoba Lock Kursi tanpa menyertakan token di header Authorization.

**Response error:**
```json
{
  "error": "unauthorized",
  "message": "Token tidak ditemukan. Sertakan Authorization: Bearer <token>",
  "correlationId": "postman-1787378631298"
}
```

**Penyebab:**
- Token dari Login belum di-set di variable collection
- Tab Authorization di request tidak dikonfigurasi sebagai Bearer Token
- Script Tests di request Login tidak menyimpan token ke collection variable

**Penyelesaian:**
1. Pastikan request Login sudah di-run terlebih dahulu
2. Di tab **Scripts → After response**, tambahkan:
   ```javascript
   pm.collectionVariables.set("token", pm.response.json().token);
   ```
3. Di request Lock Kursi → tab **Authorization** → Type: **Bearer Token** → Token: `{{token}}`

**Status:** ✅ Terselesaikan

---

### Error 3 — `500 Internal Server Error` pada POST /payments

**Kapan terjadi:** Saat tab Body di request `/payments` kosong (masih di tab Params, bukan Body).

**Response error:**
```json
{
  "error": "internal_error",
  "message": "Terjadi kesalahan server"
}
```

**Penyebab:**
- Request dikirim tanpa body (field `order_id`, `user_id`, `method` tidak ada)
- Body tab belum dipilih → server tidak bisa baca request body

**Penyelesaian:**
1. Klik tab **Body**
2. Pilih **raw**
3. Dropdown pilih **JSON**
4. Isi body:
   ```json
   {
     "order_id": 110,
     "user_id": "user_test",
     "method": "gopay"
   }
   ```

**Status:** ✅ Terselesaikan

---

### Error 4 — `402 Payment Required` pada POST /payments

**Kapan terjadi:** Saat melakukan pembayaran, sesekali mendapat response 402.

**Response error:**
```json
{
  "id": 52,
  "order_id": 111,
  "amount": "350000.00",
  "method": "gopay",
  "status": "failed",
  "paid_at": null,
  "message": "Pembayaran gagal. Kursi tetap terkunci hingga masa berlaku habis."
}
```

**Penyebab:**
- Sistem menggunakan **simulasi payment gateway** dengan **10% probabilitas gagal** (by design)
- Kode di `payment-gateway.adapter.js`:
  ```javascript
  return Math.random() < 0.9; // 90% sukses, 10% gagal
  ```

**Penyelesaian:**
- Kirim ulang request (klik Send lagi) — dalam 2–3 percobaan biasanya sukses
- Ini adalah **skenario yang valid** untuk mendokumentasikan payment failure + Saga rollback

**Catatan:** Saat payment gagal, sistem otomatis publish `payment.failed` ke RabbitMQ → ticket-service melepas lock kursi (Saga rollback sesuai ADR-004).

**Status:** ✅ Sesuai desain — bukan bug

---

### Error 5 — `400 Bad Request` pada GET /orders?user_id

**Kapan terjadi:** Saat mengambil daftar order tanpa parameter `user_id`.

**Response error:**
```json
{
  "error": "bad_request",
  "message": "user_id wajib"
}
```

**Penyebab:**
- URL diakses sebagai `GET /orders` tanpa query parameter

**Penyelesaian:**
- Tambahkan query parameter: `GET /orders?user_id=user_001`
- Atau gunakan `{{user_id}}` dari collection variable

**Status:** ✅ Terselesaikan

---

### Error 6 — `400 Bad Request` pada GET /orders/{id} (variable kosong)

**Kapan terjadi:** Saat URL menggunakan `{{order_id}}` tapi variable belum terisi (merah di Postman).

**URL yang bermasalah:**
```
{{base_url}}/orders/{{order_id}}
```

**Response error:**
```json
{
  "error": "bad_request",
  "message": "user_id wajib"
}
```

**Penyebab:**
- Variable `{{order_id}}` masih kosong karena request Lock Kursi belum dijalankan, atau script Tests belum menyimpan ID

**Penyelesaian:**
- Jalankan request Lock Kursi terlebih dahulu
- Atau ganti URL manual: `{{base_url}}/orders/110`

**Status:** ✅ Terselesaikan

---

### Error 7 — Backend Down (Semua request gagal connect)

**Kapan terjadi:** Semua request gagal dengan error `connection refused` atau tidak ada response.

**Error di Postman:**
```
Error: connect ECONNREFUSED 127.0.0.1:3000
```

**Penyebab:**
- Docker Desktop tidak berjalan
- Container belum distart (`docker compose up -d`)

**Penyelesaian:**
```bash
# 1. Start Docker Desktop
# 2. Jalankan semua container
cd Lab-kelompok-05-tiket
docker compose up -d

# 3. Tunggu sampai semua healthy
docker compose ps
# api-gateway harus Up (healthy)

# 4. Verifikasi
curl http://localhost:3000/health
```

**Status:** ✅ Terselesaikan

---

### Error 8 — `409 Conflict` saat Register userId yang Sudah Ada

**Kapan terjadi:** Saat mencoba mendaftar dengan `userId` yang sudah terdaftar sebelumnya.

**Response error:**
```json
{
  "error": "user_exists",
  "message": "User ID 'mahasiswa_demo' sudah terdaftar. Gunakan User ID lain atau langsung login."
}
```

**Penyebab:**
- userId sudah diregistrasi sebelumnya (tersimpan di Redis)

**Penyelesaian:**
- Gunakan userId berbeda untuk register
- Atau gunakan `POST /auth/login` jika userId sudah terdaftar

**Status:** ✅ Sesuai desain — pencegahan duplikat akun

---

## 9. Ringkasan Hasil Pengujian

### Hasil per Endpoint

| # | Endpoint | Method | Status Diuji | Hasil | Keterangan |
|---|---|---|---|---|---|
| 1 | `/auth/login` | POST | 200 | ✅ PASS | Token JWT berhasil didapat |
| 2 | `/auth/register` | POST | 201 | ✅ PASS | Akun baru berhasil dibuat |
| 3 | `/auth/register` | POST | 400 | ✅ PASS | Validasi nama kosong bekerja |
| 4 | `/auth/register` | POST | 409 | ✅ PASS | Duplikat userId dicegah |
| 5 | `/catalog` | GET | 200 | ✅ PASS | 30 event tampil |
| 6 | `/events/1/seats` | GET | 200 | ✅ PASS | Ketersediaan kursi real-time |
| 7 | `/orders` | POST | 201 | ✅ PASS | Redis NX EX lock berhasil |
| 8 | `/orders` | POST | 409 | ✅ PASS | Anti-oversell tercegah |
| 9 | `/orders/:id` | GET | 200 | ✅ PASS | Status locked/confirmed |
| 10 | `/payments` | POST | 201 | ✅ PASS | Saga RabbitMQ terpicu |
| 11 | `/payments` | POST | 402 | ✅ PASS | Payment failure simulation |
| 12 | `/notifications/:userId` | GET | 200 | ✅ PASS | E-ticket notifikasi tampil |

---

### Daftar Error yang Ditemukan & Status

| # | Error | HTTP Code | Penyebab | Status |
|---|---|---|---|---|
| 1 | Register tanpa `name` | 400 | Field wajib kosong | ✅ Fix: tambah `name` |
| 2 | Request tanpa token | 401 | Header Authorization kosong | ✅ Fix: set Bearer Token |
| 3 | POST /payments tanpa body | 500 | Tab Body kosong di Postman | ✅ Fix: isi raw JSON |
| 4 | Payment gateway gagal | 402 | Simulasi 10% fail by design | ✅ Retry berhasil |
| 5 | GET /orders tanpa user_id | 400 | Query param wajib | ✅ Fix: tambah `?user_id=` |
| 6 | Variable `{{order_id}}` kosong | 400 | Lock Kursi belum dijalankan | ✅ Fix: run berurutan |
| 7 | Connection refused | — | Docker/backend mati | ✅ Fix: `docker compose up -d` |
| 8 | Register userId duplikat | 409 | userId sudah terdaftar | ✅ Sesuai desain |

---

### Statistik Pengujian

| Metrik | Nilai |
|---|---|
| Total endpoint diuji | 12 |
| Test PASS | **12 / 12** (100%) |
| Error ditemukan | 8 |
| Error terselesaikan | **8 / 8** (100%) |
| Error by design (bukan bug) | 2 (402 payment, 409 anti-oversell) |
| Durasi total pengujian | ±45 menit |

---

### Alur Pengujian End-to-End

```
POST /auth/login           → 200 OK + token ✅
        ↓
POST /auth/register        → 201 Created ✅ (user baru)
        ↓
GET  /catalog              → 200 OK + 30 events ✅
        ↓
GET  /events/1/seats       → 200 OK + ketersediaan kursi ✅
        ↓
POST /orders               → 201 Created, status=locked ✅ (Redis NX EX)
        ↓
POST /payments             → 201 Created, status=success ✅ (Saga RabbitMQ)
        ↓
GET  /orders/:id           → 200 OK, status=confirmed ✅ (Saga berhasil)
        ↓
GET  /notifications/:id    → 200 OK + e-ticket ✅
        ↓
POST /orders (duplikat)    → 409 Conflict ✅ (anti-oversell)
```

---

*Dokumen ini merupakan bagian dari laporan praktikum Microservices Kelompok 5 — Universitas Muhammadiyah Makassar.*

**Kelompok 5 | Universitas Muhammadiyah Makassar**  
**Base URL:** `http://localhost:3000`  
**Tool:** Postman

---

## Daftar Isi
1. [Login](#1-login)
2. [Lock Kursi — WAR TIKET!](#2-lock-kursi--war-tiket)
3. [Bayar Tiket](#3-bayar-tiket)
4. [Konfirmasi Order](#4-konfirmasi-order)
5. [Anti-Oversell 409](#5-anti-oversell-409)

---

> **Cara pakai:**
> 1. Jalankan `docker compose up -d` di folder project
> 2. Buka Postman → jalankan request sesuai urutan
> 3. Semua request (kecuali Login) butuh header: `Authorization: Bearer <token>`

---

## 1. Login

Mendapatkan token JWT untuk mengakses semua endpoint.

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3000/auth/login` |
| **Auth** | Tidak diperlukan |

**Body (raw JSON):**
```json
{
  "userId": "user_001"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "user_001",
  "name": "user_001",
  "role": "user",
  "message": "Selamat datang kembali, user_001!"
}
```

📸 **Screenshot:**

![Login](gambar/login.png) — WAR TIKET!

Mengunci kursi menggunakan Redis `SET NX EX` — inti anti-oversell sistem (ADR-001).

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3000/orders` |
| **Auth** | `Bearer <token>` |

**Headers:**
| Key | Value |
|---|---|
| Authorization | `Bearer <token dari step 1>` |
| Content-Type | `application/json` |

**Body (raw JSON):**
```json
{
  "event_id": 1,
  "seat_category_id": 3,
  "user_id": "user_test"
}
```

**Response (201 Created):**
```json
{
  "id": 110,
  "event_name": "Konser Dewa 19 Reuni",
  "seat_category_name": "Festival",
  "price": "350000.00",
  "status": "locked",
  "lock_expires_at": "2026-08-22T06:03:52.279Z",
  "message": "Kursi dikunci selama 15 menit. Segera bayar sebelum kedaluwarsa."
}
```

> 📌 Catat nilai `id` (contoh: `110`) — dipakai di step 3 & 4.

📸 **Screenshot:**

![Lock Kursi](gambar/orders.png)

---

## 3. Bayar Tiket

Memproses pembayaran. Setelah sukses, sistem akan otomatis:
- Publish `payment.confirmed` ke **RabbitMQ** (Saga — ADR-004)
- `ticket-service` update order → `confirmed`
- `notification-service` kirim e-ticket

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3000/payments` |
| **Auth** | `Bearer <token>` |

**Body (raw JSON):**
```json
{
  "order_id": 110,
  "user_id": "user_test",
  "method": "gopay"
}
```

> Ganti `110` dengan `id` dari Step 2.  
> Metode: `bank_transfer` · `credit_card` · `gopay` · `ovo` · `dana`

**Response (201 Created):**
```json
{
  "id": 51,
  "order_id": 110,
  "amount": "350000.00",
  "method": "gopay",
  "status": "success",
  "paid_at": "2026-08-22T05:49:09.019Z",
  "message": "Pembayaran berhasil! E-tiket akan segera dikirim."
}
```

📸 **Screenshot:**

![Bayar Tiket](gambar/payments.png)

---

## 4. Konfirmasi Order

Memverifikasi status order berubah dari `locked` → `confirmed` setelah pembayaran (bukti RabbitMQ Saga berjalan).

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3000/orders/110` |
| **Auth** | `Bearer <token>` |

> Ganti `110` dengan `id` dari Step 2.

**Response (200 OK):**
```json
{
  "id": 110,
  "status": "confirmed",
  "event_name": "Konser Dewa 19 Reuni",
  "seat_category_name": "Festival",
  "price": "350000.00"
}
```

📸 **Screenshot:**

![Konfirmasi Order](gambar/getorder.png)

---

## 5. Anti-Oversell 409

Membuktikan sistem mencegah double-booking — Redis `SET NX EX` hanya mengizinkan 1 user mengunci kursi yang sama.

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3000/orders` |
| **Auth** | `Bearer <token>` |

**Body (raw JSON) — user berbeda, event & kategori SAMA:**
```json
{
  "event_id": 1,
  "seat_category_id": 3,
  "user_id": "user_lain"
}
```

**Response (409 Conflict):**
```json
{
  "error": "duplicate_order",
  "message": "Kamu sudah memiliki pesanan aktif untuk konser ini"
}
```

> ℹ️ **409 bukan error** — ini adalah fitur anti-oversell yang bekerja dengan benar.

📸 **Screenshot:**

![Anti-Oversell 409](gambar/oversell.png)

---

## Ringkasan Alur

```
POST /auth/login     → Dapat token JWT
        ↓
POST /orders         → Lock kursi (Redis NX EX) → dapat order_id
        ↓
POST /payments       → Bayar → trigger RabbitMQ Saga
        ↓
GET  /orders/{id}    → Status berubah: locked → confirmed ✅
        ↓
POST /orders (lagi)  → User lain coba beli kursi sama → 409 ❌
```

---

*Kelompok 5 | Praktikum Microservices | Universitas Muhammadiyah Makassar*

**Kelompok 5 | Universitas Muhammadiyah Makassar**  
**Base URL:** `http://localhost:3000`  
**Tool:** Postman

---

## Daftar Isi
1. [Health Check](#1-health-check)
2. [Login](#2-login)
3. [Catalog Event](#3-catalog-event)
4. [Detail Event](#4-detail-event)
5. [Ketersediaan Kursi](#5-ketersediaan-kursi)
6. [Lock Kursi — WAR TIKET!](#6-lock-kursi--war-tiket)
7. [Cek Status Order](#7-cek-status-order)
8. [Bayar Tiket](#8-bayar-tiket)
9. [Konfirmasi Order](#9-konfirmasi-order)
10. [Notifikasi](#10-notifikasi)
11. [Register User Baru](#11-register-user-baru)
12. [Rate Limit (ADR-005)](#12-rate-limit-adr-005)

---

## 1. Health Check

**Tujuan:** Memastikan API Gateway dan semua service berjalan.

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3000/health` |
| **Auth** | Tidak diperlukan |

**Request di Postman:**
```
GET http://localhost:3000/health
```

**Response yang diharapkan (200 OK):**
```json
{
  "status": "ok",
  "service": "api-gateway",
  "timestamp": "2026-08-22T...",
  "upstreams": {
    "event-service": "http://event-service:3001",
    "ticket-service": "http://ticket-service:3002",
    "payment-service": "http://payment-service:3003",
    "notification-service": "http://notification-service:3004"
  }
}
```

📸 **Screenshot Postman:**
> *(Sisipkan screenshot hasil Postman di sini)*

---

## 2. Login

**Tujuan:** Mendapatkan token JWT untuk mengakses semua endpoint terproteksi.

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3000/auth/login` |
| **Auth** | Tidak diperlukan |
| **Content-Type** | `application/json` |

**Body (raw JSON):**
```json
{
  "userId": "user_001"
}
```

> 💡 User yang tersedia di seed data: `user_001` s/d `user_010`, `user_test`

**Response yang diharapkan (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "user_001",
  "name": "user_001",
  "role": "user",
  "message": "Selamat datang kembali, user_001!"
}
```

> ⚠️ **Salin nilai `token`** dan gunakan sebagai `Authorization: Bearer <token>` di semua request berikutnya.

📸 **Screenshot Postman:**
> *(Sisipkan screenshot hasil Postman di sini)*

---

## 3. Catalog Event

**Tujuan:** Mengambil semua event yang sedang dijual. Di-cache Redis 5 detik (ADR-001).

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3000/catalog` |
| **Auth** | `Bearer <token>` |

**Headers di Postman:**
| Key | Value |
|---|---|
| Authorization | `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

**Response yang diharapkan (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Konser Dewa 19 Reuni",
      "venue": "Gelora Bung Karno, Jakarta",
      "event_date": "2026-09-20T19:00:00.000Z",
      "status": "on_sale",
      "categories": [
        { "id": 3, "name": "Festival", "available_seats": 4998, "price": "350000.00" },
        { "id": 2, "name": "VIP",      "available_seats": 498,  "price": "750000.00" },
        { "id": 1, "name": "VVIP",     "available_seats": 199,  "price": "2500000.00" }
      ]
    }
  ]
}
```

📸 **Screenshot Postman:**
> *(Sisipkan screenshot hasil Postman di sini)*

---

## 4. Detail Event

**Tujuan:** Melihat informasi lengkap satu event.

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3000/events/1` |
| **Auth** | `Bearer <token>` |

**Response yang diharapkan (200 OK):**
```json
{
  "id": 1,
  "name": "Konser Dewa 19 Reuni",
  "venue": "Gelora Bung Karno, Jakarta",
  "event_date": "2026-09-20T19:00:00.000Z",
  "description": "Reuni legenda rock Indonesia...",
  "status": "on_sale"
}
```

📸 **Screenshot Postman:**
> *(Sisipkan screenshot hasil Postman di sini)*

---

## 5. Ketersediaan Kursi

**Tujuan:** Melihat jumlah kursi tersedia per kategori untuk suatu event.

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3000/events/1/seats` |
| **Auth** | `Bearer <token>` |

**Response yang diharapkan (200 OK):**
```json
{
  "event_id": 1,
  "event_name": "Konser Dewa 19 Reuni",
  "categories": [
    {
      "id": 3,
      "name": "Festival",
      "total_seats": 5000,
      "available_seats": 4998,
      "price": "350000.00"
    },
    {
      "id": 2,
      "name": "VIP",
      "total_seats": 500,
      "available_seats": 498,
      "price": "750000.00"
    }
  ]
}
```

📸 **Screenshot Postman:**
> *(Sisipkan screenshot hasil Postman di sini)*

---

## 6. Lock Kursi — WAR TIKET!

**Tujuan:** Mengunci kursi selama 15 menit menggunakan Redis `SET NX EX` (ADR-001 — anti-oversell layer 2).

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3000/orders` |
| **Auth** | `Bearer <token>` |
| **Content-Type** | `application/json` |

**Headers di Postman:**
| Key | Value |
|---|---|
| Authorization | `Bearer <token>` |
| Content-Type | `application/json` |
| X-Correlation-ID | `postman-test-001` |

**Body (raw JSON):**
```json
{
  "event_id": 1,
  "seat_category_id": 3,
  "user_id": "user_test"
}
```

**Response berhasil (201 Created):**
```json
{
  "id": 110,
  "user_id": "user_test",
  "event_id": 1,
  "seat_category_id": 3,
  "event_name": "Konser Dewa 19 Reuni",
  "seat_category_name": "Festival",
  "price": "350000.00",
  "status": "locked",
  "lock_expires_at": "2026-08-22T06:03:52.279Z",
  "message": "Kursi dikunci selama 15 menit. Segera bayar sebelum kedaluwarsa."
}
```

> 📌 Catat nilai `id` dari response (contoh: `110`) — akan dipakai sebagai `order_id` di Step 8.

**Response jika kursi sudah dikunci user lain (409 Conflict):**
```json
{
  "error": "duplicate_order",
  "message": "Kamu sudah memiliki pesanan aktif untuk konser ini"
}
```

> ℹ️ **409 bukan error sesungguhnya** — ini adalah mekanisme anti-oversell yang bekerja dengan benar.

📸 **Screenshot Postman (201 berhasil):**
> *(Sisipkan screenshot hasil Postman di sini)*

📸 **Screenshot Postman (409 anti-oversell):**
> *(Sisipkan screenshot hasil Postman di sini)*

---

## 7. Cek Status Order

**Tujuan:** Melihat status order setelah dikunci.

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3000/orders/110` |
| **Auth** | `Bearer <token>` |

> Ganti `110` dengan `id` yang didapat dari Step 6.

**Response (200 OK):**
```json
{
  "id": 110,
  "status": "locked",
  "event_name": "Konser Dewa 19 Reuni",
  "seat_category_name": "Festival",
  "price": "350000.00",
  "lock_expires_at": "2026-08-22T06:03:52.279Z"
}
```

📸 **Screenshot Postman:**
> *(Sisipkan screenshot hasil Postman di sini)*

---

## 8. Bayar Tiket

**Tujuan:** Memproses pembayaran. Setelah sukses, sistem akan:
1. Publish `payment.confirmed` ke RabbitMQ (Saga Choreography — ADR-004)
2. `ticket-service` consume event → update order status menjadi `confirmed`
3. `notification-service` consume event → kirim e-ticket

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3000/payments` |
| **Auth** | `Bearer <token>` |
| **Content-Type** | `application/json` |

**Body (raw JSON):**
```json
{
  "order_id": 110,
  "user_id": "user_test",
  "method": "gopay"
}
```

> Metode tersedia: `bank_transfer` · `credit_card` · `gopay` · `ovo` · `dana`

**Response berhasil (201 Created):**
```json
{
  "id": 51,
  "order_id": 110,
  "user_id": "user_test",
  "amount": "350000.00",
  "method": "gopay",
  "status": "success",
  "paid_at": "2026-08-22T05:49:09.019Z",
  "message": "Pembayaran berhasil! E-tiket akan segera dikirim."
}
```

📸 **Screenshot Postman:**
> *(Sisipkan screenshot hasil Postman di sini)*

---

## 9. Konfirmasi Order

**Tujuan:** Memverifikasi bahwa status order berubah menjadi `confirmed` setelah pembayaran (bukti Saga berjalan).

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3000/orders/110` |
| **Auth** | `Bearer <token>` |

**Response (200 OK) — status sudah berubah:**
```json
{
  "id": 110,
  "status": "confirmed",
  "event_name": "Konser Dewa 19 Reuni",
  "seat_category_name": "Festival",
  "price": "350000.00"
}
```

> ✅ Status berubah dari `locked` → `confirmed` — bukti bahwa RabbitMQ Saga berhasil dieksekusi.

📸 **Screenshot Postman:**
> *(Sisipkan screenshot hasil Postman di sini)*

---

## 10. Notifikasi

**Tujuan:** Melihat notifikasi user termasuk e-ticket yang dikirim setelah pembayaran.

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3000/notifications/user_001` |
| **Auth** | `Bearer <token>` |

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "user_id": "user_001",
    "type": "ETICKET",
    "channel": "EMAIL",
    "status": "SENT",
    "payload": {
      "event_name": "Konser Dewa 19 Reuni",
      "seat_category": "Festival"
    },
    "sent_at": "2026-08-22T05:49:12.000Z"
  }
]
```

📸 **Screenshot Postman:**
> *(Sisipkan screenshot hasil Postman di sini)*

---

## 11. Register User Baru

**Tujuan:** Membuat akun user baru. Berbeda dengan Login — Register membutuhkan `name`.

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3000/auth/register` |
| **Auth** | Tidak diperlukan |
| **Content-Type** | `application/json` |

**Body (raw JSON) — field `name` WAJIB:**
```json
{
  "userId": "mahasiswa_demo",
  "name": "Mahasiswa Demo Unismuh",
  "email": "demo@student.unismuh.ac.id"
}
```

> ⚠️ **Perbedaan Register vs Login:**
> - `/auth/register` → butuh `userId` + `name` → membuat akun baru
> - `/auth/login` → butuh `userId` saja → masuk dengan akun yang sudah ada

**Response berhasil (201 Created):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "mahasiswa_demo",
  "name": "Mahasiswa Demo Unismuh",
  "role": "user",
  "message": "Selamat datang, Mahasiswa Demo Unismuh! Akun berhasil dibuat."
}
```

**Response jika `name` kosong (400 Bad Request):**
```json
{
  "error": "validation_error",
  "message": "Nama wajib diisi dan minimal 2 karakter"
}
```

**Response jika `userId` sudah dipakai (409 Conflict):**
```json
{
  "error": "user_exists",
  "message": "User ID 'mahasiswa_demo' sudah terdaftar."
}
```

📸 **Screenshot Postman (201 berhasil):**
> *(Sisipkan screenshot hasil Postman di sini)*

📸 **Screenshot Postman (400 validasi error):**
> *(Sisipkan screenshot hasil Postman di sini)*

---

## 12. Rate Limit (ADR-005)

**Tujuan:** Membuktikan bahwa rate limiting berjalan (ADR-005 — sliding window counter di Redis).

**Cara test:**
1. Kirim request `GET /catalog` berkali-kali sangat cepat
2. Atau gunakan **Collection Runner** dengan 110 iterasi
3. Setelah 100 request dalam 60 detik → mendapat **429**

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3000/catalog` |
| **Auth** | `Bearer <token>` |

**Response normal (200 OK):**
```json
{ "data": [...] }
```

**Response setelah 100 request (429 Too Many Requests):**
```json
{
  "error": "too_many_requests",
  "message": "Rate limit terlampaui. Maksimal 100 request per 60 detik.",
  "retryAfter": 60,
  "correlationId": "postman-..."
}
```

**Response Headers yang muncul:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Window: 60s
```

📸 **Screenshot Postman (200 normal):**
> *(Sisipkan screenshot hasil Postman di sini)*

📸 **Screenshot Postman (429 rate limit):**
> *(Sisipkan screenshot hasil Postman di sini)*

---

## Ringkasan Alur Test

```
1. GET  /health                     → Pastikan backend hidup
2. POST /auth/login                 → Dapat JWT token
3. GET  /catalog                    → Lihat semua event
4. GET  /events/1                   → Detail event
5. GET  /events/1/seats             → Cek ketersediaan kursi
6. POST /orders                     → LOCK KURSI (catat order_id)
7. GET  /orders/{order_id}          → Lihat status: locked
8. POST /payments                   → BAYAR
9. GET  /orders/{order_id}          → Status berubah: confirmed ✅
10. GET /notifications/{user_id}    → Cek e-ticket
```

---

*Kelompok 5 | Praktikum Microservices | Universitas Muhammadiyah Makassar*
