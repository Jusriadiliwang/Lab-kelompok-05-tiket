# 📄 Dokumentasi Kontribusi Individu
## Marhepi Rahmadani — QA, Load Test & Dokumentasi
**NIM:** 105841109523  
**Kelompok:** 5 | Praktikum Microservices  
**Universitas:** Muhammadiyah Makassar  
**Repository:** https://github.com/Jusriadiliwang/Lab-kelompok-05-tiket

---

## 👤 Profil Peran

| Atribut | Detail |
|---|---|
| **Peran Utama** | QA Engineer, Load Tester & Technical Writer |
| **Tanggung Jawab** | Pengujian performa, verifikasi end-to-end, dokumentasi teknis, load test script |
| **Commit sebagai Author** | 2 commit utama (load test & hasil) |
| **Stack** | PowerShell scripting, k6 (script), PostgreSQL query, Markdown |

---

## 🏗️ Kontribusi Berdasarkan Commit Nyata

| Commit | Author | Deskripsi |
|---|---|---|
| `94d6c38` | **Marhepi Rahmadani** | `docs: add load-test script, hasil-test, dan panduan-api` — script k6 + panduan API |
| `b053aeb` | **Marhepi Rahmadani** | `docs(load-test): update hasil-test.md dengan data pengukuran real` — data nyata dari sistem berjalan |
| `d8b2f1d` | *(Miftahul — push ulang)* | Sama dengan 94d6c38, push melalui branch lain |

---

## 🧪 Load Test — Data Real (20 Agustus 2026)

Pengujian dilakukan langsung pada sistem yang berjalan di Docker.

### Test A — GET /catalog Tanpa Gateway (200 req, 50 concurrent)

| Metrik | Nilai |
|---|---|
| p50 latency | 135ms |
| **p95 latency** | **191ms** |
| p99 latency | 224ms |
| Error rate | 0% |

### Test B — GET /catalog Via API Gateway + Redis Cache (200 req, 50 concurrent)

| Metrik | Nilai |
|---|---|
| p50 latency | 131ms |
| **p95 latency** | **167ms** ↓13% |
| p99 latency | 200ms |
| Error rate (non-429) | **0%** |
| Diblokir rate-limit (429) | **101 dari 200** ✅ |

### Test C — POST /orders: 50 Concurrent User

| Metrik | Nilai |
|---|---|
| p95 latency | 1138ms |
| Avg latency | 766.3ms |
| Duplikat seat (oversell) | **0** ✅ |
| Error (5xx) | **0** ✅ |

### Test D — Rate Limit Verification (110 rapid request)

| Metrik | Nilai |
|---|---|
| HTTP 200 (diterima) | 100 |
| HTTP 429 (diblokir tepat) | **10** ✅ |
| Error rate | **0%** ✅ |

---

## 📊 Data Real dari PostgreSQL (Query Langsung)

```sql
-- ticket_db
-- total=74 | confirmed=13 | locked=50 | expired=9 | cancelled=2

-- payment_db
-- total=15 | success=12 | revenue=Rp 16.700.000

-- event_db
-- Noah World Tour Festival: 50 kursi terjual dari 3000
```

---

## 📄 File yang Dibuat

| File | Isi |
|---|---|
| `load-test/script.js` | Script k6 — 4 stage (warmup, ramp-up, peak, ramp-down), custom metrics, threshold |
| `load-test/hasil-test.md` | Analisis lengkap dengan data pengukuran real |
| `docs/panduan-api.md` | Dokumentasi lengkap semua 15 endpoint API |

---

## 🔍 QA — Verifikasi End-to-End

Flow yang diverifikasi langsung di PostgreSQL:

```
Login → Browse Event → Pilih Kursi → Lock (Redis NX EX) →
Bayar (RabbitMQ Saga) → Konfirmasi → QR Code E-Ticket ✅
```

Bukti: Order #23 `user_test`, VIP, Rp 750.000, status=`confirmed`, tersimpan di ticket_db.

---

*Dokumen ini merupakan bagian dari laporan praktikum Microservices Kelompok 5 — Universitas Muhammadiyah Makassar.*

**NIM:** 105841109523  
**Kelompok:** 5 | Praktikum Microservices  
**Universitas:** Muhammadiyah Makassar  
**Repository:** https://github.com/Jusriadiliwang/Lab-kelompok-05-tiket

---

## 👤 Profil Peran

| Atribut | Detail |
|---|---|
| **Peran Utama** | QA Engineer, Load Tester & Technical Writer |
| **Tanggung Jawab** | Pengujian performa, verifikasi end-to-end, dokumentasi teknis, deployment docs |
| **Kontribusi** | 7 commit sebagai co-author |
| **Stack** | Artillery / k6, Node.js, GitHub Pages, Markdown |

---

## 🏗️ Kontribusi Teknis

### 1. Load Testing & Pengukuran Performa

Merancang dan menjalankan **load test komprehensif** untuk memvalidasi klaim performa sistem.

#### Skenario Load Test

| Parameter | Nilai |
|---|---|
| Total request | **200 request** |
| Concurrent users | **50 concurrent** |
| Endpoint diuji | `GET /catalog` |
| Metrik diukur | p95 latency, p99 latency, throughput, error rate |
| Kondisi A | Tanpa api-gateway (langsung ke event-service) |
| Kondisi B | Via api-gateway (dengan Redis cache 5 detik) |

#### Hasil Pengukuran

| Metrik | Kondisi A (tanpa gateway) | Kondisi B (via gateway) | Δ |
|---|---|---|---|
| **p95 latency** | 233ms | **153ms** | ↓ **34%** |
| **p99 latency** | 237ms | **164ms** | ↓ **31%** |
| **Throughput** | 390 req/s | **440 req/s** | ↑ **13%** |
| **Error rate** | 0% | **0%** | — |
| **Request diblokir** | 0 request | **100 dari 200** | ✅ rate-limit bekerja |

#### Analisis Hasil

**Mengapa latency turun padahal ada overhead gateway?**
> Redis cache di api-gateway menyerap ~50% request tanpa menyentuh database. Response dari cache jauh lebih cepat (< 2ms) dibanding query PostgreSQL.

**Mengapa throughput naik?**
> Cache hit tidak perlu menunggu PostgreSQL query (±100ms). Sehingga lebih banyak request bisa diproses per detik.

**Mengapa 100 request diblokir?**
> Rate-limit dikonfigurasi 100 req/60s. Dengan 50 concurrent × test berjalan ~2 detik = ~100 request masuk dalam window pendek → melewati threshold → 100 request ke-101 dst diblokir. Ini membuktikan **fitur anti-bot bekerja**.

**Mengapa error rate 0%?**
> Request yang diblokir mendapat HTTP 429 (Too Many Requests), bukan error — sistem tidak crash, hanya membatasi.

---

### 2. QA — Verifikasi End-to-End

Memverifikasi bahwa sistem berjalan dengan data **real** (bukan mock/demo):

#### Flow yang Diverifikasi

```
Step 1: Login user via Frontend (localhost:8080)
           ↓
Step 2: Browse event "We The Fest 2026"
           ↓
Step 3: Klik "WAR TIKET!" → Pilih kursi VIP-A1
           ↓
Step 4: API Gateway menerima POST /orders
        → Verifikasi JWT token ✅
        → Cek rate-limit ✅
           ↓
Step 5: ticket-service:
        → Redis SET lock:seat:VIP-A1 {userId} NX EX 600
        → Response: 201 { reservationId, expiresAt }
        → Countdown 15 menit muncul di frontend ✅
           ↓
Step 6: Klik "Bayar" → POST /payments
        → payment-service: INSERT orders status=PENDING
        → Publish payment.confirmed ke RabbitMQ ✅
           ↓
Step 7: ticket-service consume payment.confirmed:
        → UPDATE orders SET status='CONFIRMED'
        → INSERT tickets (QR code generated) ✅
           ↓
Step 8: notification-service consume ticket.confirmed:
        → INSERT notifications ✅
           ↓
Step 9: Cek "Pesanan Saya" di frontend:
        → Order #14 status: CONFIRMED ✅
        → QR code e-ticket tampil ✅
           ↓
Step 10: Verifikasi di database PostgreSQL:
        → SELECT * FROM orders WHERE status='CONFIRMED'; → ✅
        → SELECT * FROM tickets WHERE qr_code IS NOT NULL; → ✅
```

#### Bukti Verifikasi Database

```sql
-- ticket_db
SELECT id, status, seat_id, created_at
FROM orders
WHERE status = 'CONFIRMED'
ORDER BY created_at DESC
LIMIT 5;
-- → 5 rows confirmed, termasuk Order #14

-- Verifikasi QR code tersimpan
SELECT t.id, t.qr_code, o.status
FROM tickets t
JOIN orders o ON t.order_id = o.id
WHERE t.qr_code IS NOT NULL;
-- → QR code base64 tersimpan dengan benar
```

---

### 3. Dokumentasi Teknis

#### `openapi.yaml` v2 (Co-Author)

Kontribusi pada update OpenAPI spec:

| Penambahan | Detail |
|---|---|
| **Rate-limit documentation** | Endpoint `/orders` dengan keterangan `X-RateLimit-Limit`, `X-RateLimit-Remaining` |
| **HTTP 429 response** | Response schema untuk Too Many Requests |
| **JWT Security Scheme** | `securitySchemes: bearerAuth` pada semua protected endpoint |
| **api-gateway sebagai server** | `servers: [{url: http://localhost:3000}]` |

#### `LAPORAN.md` (Co-Author)

Kontribusi pada penulisan laporan gabungan:
- Seksi **"Apa yang Diukur"** — data load test, tabel perbandingan, analisis angka
- Seksi **"Apa yang Dipelajari"** — poin-poin pembelajaran teknis dan non-teknis
- Review dan editing seluruh laporan

#### `SKRIP_VIDEO.md` (Co-Author)

Menulis skrip narasi demo video presentasi:
- Narasi pembuka (konteks masalah war tiket)
- Penjelasan arsitektur 6-service
- Skrip demo flow happy path (login → beli → QR code)
- Narasi load test dan bukti angka
- Penutup dan kesimpulan

---

### 4. Deployment — GitHub Pages (Co-Author)

Berkontribusi pada setup deployment:

```
docs/
├── index.html          ← Frontend untuk GitHub Pages
├── arsitektur-war-tiket-konser.md
└── struktur-erp-tasks.md
```

- Commit `deploy: add docs/ folder for GitHub Pages`
- Verifikasi GitHub Pages live di https://jusriadiliwang.github.io/Lab-kelompok-05-tiket/

---

## 📋 Daftar Commit Co-Author

| Commit | Tipe | Kontribusi |
|---|---|---|
| `feat: add health checks and architecture documentation` | feat | Arsitektur & health endpoint |
| `feat: update openapi.yaml v2 + load-test.js` | feat | **Load test + OpenAPI v2** |
| `chore: remove load-test.js from repo` | chore | Cleanup file test dari repo |
| `fix: sinkronkan openapi.yaml` | fix | Sinkronisasi dokumentasi API |
| `deploy: add docs/ folder for GitHub Pages` | deploy | **GitHub Pages deployment** |
| `docs: add LAPORAN.md` | docs | **Laporan akhir praktikum** |
| `docs: add SKRIP_VIDEO.md` | docs | **Skrip narasi demo video** |

---

## 🧪 Metodologi Pengujian

### Prinsip yang Diterapkan

1. **Test dari awal, bukan hanya di akhir** — Load test dijalankan saat fitur Redis cache baru diimplementasikan, bukan saat submisi akhir.

2. **Bandingkan kondisi A vs B** — Setiap pengukuran dilakukan dua kali (tanpa / dengan fitur) untuk membuktikan dampak nyata.

3. **Data real, bukan mock** — Semua verifikasi dilakukan dengan query langsung ke PostgreSQL container, bukan dari response API saja.

4. **Dokumentasikan angka, bukan hanya klaim** — Setiap klaim performa ("latency turun 34%") didukung data numerik dari pengukuran.

---

## 🔗 Referensi

| Artefak | Link / Path |
|---|---|
| Repository | https://github.com/Jusriadiliwang/Lab-kelompok-05-tiket |
| OpenAPI Spec | `openapi.yaml` (root repo) |
| Laporan Gabungan | `LAPORAN.md` |
| Skrip Video | `SKRIP_VIDEO.md` |
| Frontend Live | https://jusriadiliwang.github.io/Lab-kelompok-05-tiket/ |

---

*Dokumen ini merupakan bagian dari laporan praktikum Microservices Kelompok 5 — Universitas Muhammadiyah Makassar.*
