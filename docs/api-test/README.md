# Panduan Import & Test API — War Tiket Konser

**Kelompok 5 | Universitas Muhammadiyah Makassar**  
**Base URL:** `http://localhost:3000`

---

## 📂 File Collection

| File | Untuk | Cara Import |
|---|---|---|
| `WarTiket-PostmanCollection.json` | **Postman** | Import → Upload Files |
| `WarTiket-ThunderClient.json` | **Thunder Client** (VS Code) | Thunder Client → Collections → Import |

---

## 🚀 Langkah Pakai Postman

### 1. Import Collection
1. Buka Postman
2. Klik **Import** (pojok kiri atas)
3. Drag & drop file `WarTiket-PostmanCollection.json`
4. Klik **Import**

### 2. Login Dulu (Wajib)
1. Buka folder **🔐 Auth**
2. Klik request **"Login"**
3. Klik **Send**
4. Token JWT otomatis tersimpan ke variable `{{token}}`

### 3. Test Endpoint Lain
Semua endpoint sudah pakai `Bearer {{token}}` — langsung klik Send.

---

## ⚡ Langkah Pakai Thunder Client (VS Code)

### 1. Install Extension
Cari "Thunder Client" di VS Code Extensions → Install

### 2. Import Collection
1. Klik icon Thunder Client di sidebar kiri
2. Klik **Collections** → titik tiga (**...**) → **Import**
3. Pilih file `WarTiket-ThunderClient.json`

### 3. Import Environment
1. Klik **Env** → titik tiga → **Import**
4. File sama: `WarTiket-ThunderClient.json` (berisi env juga)

### 4. Login Dulu
1. Buka collection → folder **🔐 Auth** → **Login**
2. Klik **Send**
3. Copy nilai `token` dari response
4. Paste ke Environment variable `token`

---

## 📋 Urutan Test yang Disarankan

```
1. Health Check              GET  /health          → Pastikan backend up
2. Login                     POST /auth/login       → Dapat JWT token
3. GET Catalog               GET  /catalog          → Lihat semua event (Redis cache)
4. GET Event Detail          GET  /events/1         → Detail Konser Dewa 19
5. GET Ketersediaan Kursi    GET  /events/1/seats   → Lihat kategori & sisa kursi
6. Lock Kursi (WAR TIKET!)   POST /orders           → Lock kursi — inti sistem!
7. GET Status Order          GET  /orders/{id}      → Cek status locked
8. Bayar Tiket               POST /payments         → Bayar → trigger RabbitMQ Saga
9. GET Status Pembayaran     GET  /payments/{id}    → Pastikan status=success
10. GET Notifikasi           GET  /notifications/.. → Cek e-ticket terkirim
```

---

## 🔐 Token JWT

Token didapat dari response Login:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "user_001",
  "name": "user_001",
  "role": "user"
}
```

Masukkan di header setiap request:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📝 User ID yang Tersedia (Seed Data)

| User ID | Kondisi |
|---|---|
| `user_001` | Order confirmed, payment success |
| `user_002` | Order confirmed, payment success |
| `user_003` | Order expired (tidak bayar) |
| `user_010` | Order masih locked (belum bayar) |
| `user_test` | Bebas untuk testing |

---

## 🎯 Skenario Test Menarik

### Skenario 1: Happy Path (Lock → Bayar → Konfirmasi)
```
POST /auth/login       {"userId": "user_test"}
POST /orders           {"event_id": 2, "seat_category_id": 6, "user_id": "user_test"}
POST /payments         {"order_id": {id_dari_step_2}, "user_id": "user_test", "method": "gopay"}
GET  /orders/{id}      → status harus berubah ke "confirmed"
```

### Skenario 2: Anti-Oversell (2 User, 1 Kursi)
```
# Buka 2 tab Postman/Thunder Client
# User A:
POST /orders {"event_id": 1, "seat_category_id": 1, "user_id": "user_a"}
→ 201 (MENANG)

# User B (kirim bersamaan):
POST /orders {"event_id": 1, "seat_category_id": 1, "user_id": "user_b"}
→ 409 Conflict (KALAH — Redis NX EX bekerja!)
```

### Skenario 3: Rate Limit (ADR-005)
```
# Kirim GET /catalog berkali-kali cepat
# Setelah 100 request dalam 60 detik:
→ 429 Too Many Requests
→ {"error": "too_many_requests", "retryAfter": 60}
```

---

## 🌐 Endpoint Lain (Manual Test)

| Method | URL | Keterangan |
|---|---|---|
| GET | http://localhost:3000/health | Gateway health |
| GET | http://localhost:8080 | Frontend web |
| GET | http://localhost:15672 | RabbitMQ Management UI |
| GET | http://localhost:3001/health | event-service langsung |
| GET | http://localhost:3002/health | ticket-service langsung |
| GET | http://localhost:3003/health | payment-service langsung |

---

*Kelompok 5 | Praktikum Microservices | Universitas Muhammadiyah Makassar*
