# LAPORAN GABUNGAN — War Tiket Konser
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
