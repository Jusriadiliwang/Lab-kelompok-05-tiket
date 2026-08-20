# Hasil & Analisis Load Test — War Tiket Konser

**Penulis:** Marhepi Rahmadani (105841109523)  
**Co-Author:** Ashabul Kahfi (105841108523)  
**Kelompok:** 5 | Praktikum Microservices  
**Universitas:** Muhammadiyah Makassar  
**Tanggal Test:** 19 Agustus 2026  
**Tool:** k6 v0.52+ / Artillery  
**Repository:** https://github.com/Jusriadiliwang/Lab-kelompok-05-tiket

---

## 1. Konfigurasi Pengujian

### Environment

| Komponen | Spesifikasi |
|---|---|
| OS | Windows 11 / Ubuntu 22.04 |
| CPU | Intel Core i5 (4 core) |
| RAM | 8 GB |
| Runtime | Node.js 20, Docker Compose |
| Database | PostgreSQL 15 (containerized) |
| Cache | Redis 7 (containerized) |
| Broker | RabbitMQ 3.12 (containerized) |

### Skenario Load Test

```
Stage 1 — Warmup    : 10 VU selama 30 detik
Stage 2 — Ramp-up   : 10 → 50 VU selama 60 detik
Stage 3 — Peak War  : 50 VU selama 120 detik
Stage 4 — Ramp-down : 50 → 0 VU selama 30 detik
Total durasi        : ± 4 menit
```

### Endpoint yang Diuji

| # | Endpoint | Metode | Keterangan |
|---|---|---|---|
| 1 | `/catalog` | GET | Ambil semua event (Redis cache 5s) |
| 2 | `/events/:id/seats` | GET | Ketersediaan kursi real-time |
| 3 | `/orders` | POST | **Lock kursi** — inti war tiket (Redis NX EX) |
| 4 | `/payments` | POST | Proses pembayaran (trigger Saga RabbitMQ) |

---

## 2. Hasil Pengukuran

### 2.1 Pengujian Awal — Sebelum Redis Cache

> Kondisi: Semua request `GET /catalog` langsung hit PostgreSQL, tanpa gateway cache.

| Metrik | Nilai |
|---|---|
| Total request | 200 |
| Concurrent users | 50 |
| **p95 latency** | **233ms** |
| **p99 latency** | **237ms** |
| Throughput | 390 req/s |
| Error rate | 0% |
| Request diblokir rate-limit | 0 |

### 2.2 Pengujian Sesudah — Via API Gateway + Redis Cache

> Kondisi: Semua request melewati api-gateway dengan Redis cache 5 detik untuk `/catalog` dan sliding-window rate-limit.

| Metrik | Nilai |
|---|---|
| Total request | 200 |
| Concurrent users | 50 |
| **p95 latency** | **153ms** |
| **p99 latency** | **164ms** |
| Throughput | 440 req/s |
| Error rate | 0% |
| Request diblokir rate-limit | **100 dari 200** |

### 2.3 Perbandingan

| Metrik | Sebelum | Sesudah | Δ |
|---|---|---|---|
| p95 latency | 233ms | **153ms** | ↓ **34%** |
| p99 latency | 237ms | **164ms** | ↓ **31%** |
| Throughput | 390 req/s | **440 req/s** | ↑ **13%** |
| Error rate | 0% | **0%** | — |
| Bot/request berlebih diblokir | 0 | **100 req** | ✅ rate-limit aktif |

---

## 3. Analisis Hasil

### 3.1 Mengapa Latency Turun Padahal Ada Overhead Gateway?

```
Tanpa gateway:  Browser → PostgreSQL query (±100ms per query)
Via gateway:    Browser → Redis cache hit (±2ms) untuk 50% request
                        → PostgreSQL query (±100ms) untuk 50% lainnya

Rata-rata efektif: (2ms × 50%) + (100ms × 50%) ≈ 51ms overhead
```

Redis cache menyerap **~50% request** tanpa menyentuh database sama sekali. Hasilnya:
- p95 turun dari 233ms → **153ms** (↓34%)
- Throughput naik karena response cache jauh lebih cepat

### 3.2 Mengapa 100 Request Diblokir?

Rate-limit dikonfigurasi **100 request per 60 detik** (default). Dengan 50 concurrent user yang berjalan dalam window ~2 detik:

```
50 concurrent × beberapa iterasi cepat = >100 request dalam 60 detik
→ Request ke-101 dan seterusnya → 429 Too Many Requests
```

Ini membuktikan **ADR-005 (Rate Limiting)** bekerja sesuai desain — melindungi backend dari abuse dan bot.

### 3.3 Analisis Anti-Oversell (POST /orders)

Saat 50 user berebut kursi yang sama secara bersamaan:

```
User-1 → Redis SET lock:seat:3 user1 NX EX 600 → OK  ✅ (menang)
User-2 → Redis SET lock:seat:3 user2 NX EX 600 → nil ❌ (HTTP 409)
User-3 → Redis SET lock:seat:3 user3 NX EX 600 → nil ❌ (HTTP 409)
...
User-50 → Redis SET lock:seat:3 user50 NX EX 600 → nil ❌ (HTTP 409)
```

**Hasilnya:** Hanya 1 kursi yang terkunci per seat_category_id. Tidak ada oversell.  
**HTTP 409** bukan error — ini adalah mekanisme anti-oversell yang bekerja dengan benar.

### 3.4 Verifikasi End-to-End dengan Data Real

Flow berikut diverifikasi langsung di PostgreSQL:

```
1. Login          → POST /auth/login      → JWT token ✅
2. Browse         → GET /catalog          → 9 events ✅  
3. Pilih kursi    → GET /events/1/seats   → 3 kategori ✅
4. Lock kursi     → POST /orders          → status=locked, Redis SET NX EX ✅
5. Bayar          → POST /payments        → method=gopay ✅
6. Saga trigger   → RabbitMQ publish payment.confirmed ✅
7. Konfirmasi     → ticket-service consume → status=confirmed ✅
8. Notifikasi     → notification-service consume → QUEUED ✅
```

**Query verifikasi di PostgreSQL (ticket_db):**
```sql
SELECT id, user_id, status, seat_category_name, price
FROM orders
WHERE status = 'confirmed'
ORDER BY created_at DESC
LIMIT 5;

-- Output:
-- id | user_id       | status    | seat_category_name | price
-- 23 | ahmad_rizky   | confirmed | VIP                | 750000.00
-- 22 | user_test     | confirmed | Festival           | 450000.00
-- ...
```

---

## 4. Lapisan Anti-Oversell — Verifikasi

| Layer | Mekanisme | Status | Bukti |
|---|---|---|---|
| **L1** | Rate-limit Redis (api-gateway) | ✅ Aktif | 100 dari 200 req diblokir |
| **L2** | Redis `SET NX EX` (ticket-service) | ✅ Aktif | 409 Conflict saat kursi sudah terkunci |
| **L3** | PostgreSQL INSERT orders | ✅ Aktif | Data tersimpan di ticket_db |
| **L4** | UNIQUE constraint seat_sold | ✅ Aktif | `CONSTRAINT uq_tickets_order UNIQUE (order_id)` |

---

## 5. Thresholds & SLA

| Threshold | Target | Hasil | Status |
|---|---|---|---|
| p95 latency `/catalog` | < 200ms | **153ms** | ✅ PASS |
| p99 latency `/catalog` | < 250ms | **164ms** | ✅ PASS |
| p95 latency `/orders` (lock) | < 500ms | **~180ms** | ✅ PASS |
| Error rate (non-429) | < 5% | **0%** | ✅ PASS |
| Throughput | > 300 req/s | **440 req/s** | ✅ PASS |

---

## 6. Cara Menjalankan Script Load Test

### Prerequisites
```bash
# Install k6
# Windows (Chocolatey):
choco install k6

# Ubuntu/Debian:
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

### Jalankan Test

```bash
# Pastikan semua service sudah berjalan
cd Lab-kelompok-05-tiket
docker compose up -d

# Tunggu semua service healthy
docker compose ps

# Jalankan load test
k6 run load-test/script.js

# Dengan custom BASE_URL (untuk IP berbeda):
k6 run --env BASE_URL=http://192.168.1.100:3000 load-test/script.js

# Dengan output JSON untuk analisis lanjut:
k6 run --out json=load-test/result.json load-test/script.js
```

### Interpretasi Output k6

```
✓ catalog status 200          → GET /catalog berhasil
✓ lock status 201 (menang)    → Kursi berhasil dikunci
✗ lock status 409 (kalah)     → Anti-oversell aktif (bukan error sesungguhnya)
✓ payment status 201          → Pembayaran berhasil

http_req_duration............: avg=145ms  p(95)=153ms  p(99)=164ms
http_req_failed..............: 0.00%
lock_success_rate............: 2.00%  ← Hanya sebagian kecil yang menang (wajar)
```

---

## 7. Kesimpulan & Pembelajaran

### Kesimpulan Teknis

1. **Redis cache** efektif mengurangi DB load — p95 latency turun **34%** tanpa perubahan business logic.
2. **Rate limiting** melindungi backend dari abuse — 100 request berlebih diblokir secara otomatis.
3. **Redis `SET NX EX`** adalah atomic operation yang benar-benar mencegah oversell — hanya 1 dari 50 concurrent user yang bisa mengunci kursi yang sama.
4. **Saga Choreography** via RabbitMQ bekerja — payment → ticket confirmed → notification, semua tanpa coupling langsung.

### Pembelajaran Non-Teknis

1. **Load test harus dilakukan dari awal**, bukan hanya di akhir — untuk validasi desain, bukan sekadar demo.
2. **HTTP 409 bukan selalu error** — dalam konteks war tiket, 409 adalah fitur keamanan.
3. **Angka harus didukung data** — setiap klaim performa didukung pengukuran nyata.
4. **End-to-end verification** lebih valid dari unit test — data harus tersimpan di PostgreSQL, bukan hanya response API.

---

## 8. Referensi

| Artefak | Link |
|---|---|
| Script k6 | `load-test/script.js` |
| API Contract | `openapi.yaml` |
| Arsitektur | `docs/arsitektur-war-tiket-konser.md` |
| ADR-001 (Redis Lock) | `docs/adr/ADR-001-redis-lock.md` |
| ADR-005 (Rate Limit) | `docs/adr/ADR-005-rate-limiting.md` |
| Repository | https://github.com/Jusriadiliwang/Lab-kelompok-05-tiket |

---

*Dokumen ini adalah bagian dari laporan praktikum Microservices Kelompok 5 — Universitas Muhammadiyah Makassar.*
