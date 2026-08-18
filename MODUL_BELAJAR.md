# 📚 MODUL BELAJAR — War Tiket Konser
**Kelompok 5 | Praktikum Microservices | Universitas Muhammadiyah Makassar**

> Modul ini disusun berdasarkan peran masing-masing anggota dan apa yang telah diimplementasikan  
> pada sistem War Tiket Konser selama praktikum berlangsung.

---

## 👤 ASHABUL KAHFI (105841108523)
### Peran: Backend/API Engineer

---

### 📖 Yang Kamu Kerjakan
- Membangun REST API untuk 4 microservice (`event-service`, `ticket-service`, `payment-service`, `notification-service`)
- Mengimplementasikan endpoint CRUD: `POST /orders`, `POST /payments`, `GET /catalog`, dll
- Menghubungkan service via RabbitMQ (publisher di ticket-service → consumer di notification-service)
- Menerapkan pattern idempoten (cek duplikasi order sebelum kunci kursi)

---

### 🧠 Konsep yang Perlu Kamu Kuasai

#### 1. REST API Design
```
GET    /catalog              → idempoten, bisa di-cache
POST   /orders               → membuat resource baru, tidak idempoten
PUT    /events/:id/status    → update resource, idempoten
DELETE /tickets/lock/:id     → hapus resource
```

**Pertanyaan Refleksi:**
- Kenapa `POST /orders` tidak boleh dipanggil dua kali dengan data yang sama?
- Bagaimana cara membuat endpoint *idempoten* dengan idempotency key?
- Apa perbedaan `200 OK`, `201 Created`, `204 No Content`, `409 Conflict`?

#### 2. Middleware Chain di Express.js
```javascript
// Urutan eksekusi di api-gateway:
app.use(correlationIdMiddleware)  // 1. inject X-Correlation-ID
app.use(authMiddleware)           // 2. verifikasi JWT
app.use(rateLimitMiddleware)      // 3. cek rate limit Redis
app.use('/', router)              // 4. routing ke service
```

**Latihan:** Buat middleware yang mencatat response time setiap request.

#### 3. Error Handling yang Baik
```javascript
// Yang sudah kamu buat di controller:
try {
  const result = await service.doSomething();
  res.json(result);
} catch (err) {
  if (err.code === '23505') {           // PostgreSQL unique violation
    return res.status(409).json({ error: 'conflict' });
  }
  res.status(500).json({ error: 'internal_error', message: err.message });
}
```

**Pertanyaan:** Kenapa kita tidak boleh mengirim stack trace ke client di production?

#### 4. Async/Await vs Callback vs Promise
```javascript
// Contoh dari ticket-service - placeOrder():
async function placeOrder() {
  const lock = await seatLockService.acquireLock(key, 8000); // await
  if (!lock) return res.status(429).json({...});
  // ... code berlanjut hanya jika lock berhasil
}
```

**Latihan:** Refactor kode callback berikut menjadi async/await:
```javascript
db.query('SELECT * FROM orders', function(err, result) {
  if (err) return callback(err);
  callback(null, result.rows);
});
```

#### 5. HTTP Status Codes yang Sering Dipakai
| Code | Arti | Kapan Dipakai |
|---|---|---|
| 200 | OK | GET berhasil |
| 201 | Created | POST berhasil membuat resource |
| 204 | No Content | DELETE berhasil |
| 400 | Bad Request | Input tidak valid |
| 401 | Unauthorized | Token tidak ada/invalid |
| 403 | Forbidden | Token valid tapi tidak punya izin |
| 404 | Not Found | Resource tidak ada |
| 409 | Conflict | Duplikat/state conflict |
| 429 | Too Many Requests | Rate limit |
| 502 | Bad Gateway | Service downstream error |

---

### 🚀 Tantangan Selanjutnya
1. **Implementasi circuit breaker**: Kalau `event-service` down, `ticket-service` jangan crash
2. **Retry mechanism**: Kalau RabbitMQ publish gagal, coba lagi 3x dengan backoff
3. **Distributed tracing**: Tambahkan OpenTelemetry untuk trace request lintas service

---
---

## 👤 JUSRIADI LIWANG (105841117023)
### Peran: Data & Persistence Engineer

---

### 📖 Yang Kamu Kerjakan
- Merancang skema database PostgreSQL untuk setiap service (database per service)
- Menulis migration SQL (`event_init.sql`, `ticket_init.sql`, `payment_init.sql`, dll)
- Implementasi koneksi database dengan connection pooling (`pg.Pool`)
- Membuat seed data realistis (10 orders, 6 tickets, 7 payments)
- Membangun frontend (`frontend/index.html`) sebagai wajah sistem

---

### 🧠 Konsep yang Perlu Kamu Kuasai

#### 1. Database per Service Pattern
```
event_db   ← hanya event-service yang bisa akses
ticket_db  ← hanya ticket-service yang bisa akses
payment_db ← hanya payment-service yang bisa akses
erp_db     ← hanya erp-service yang bisa akses
```

**Pertanyaan:** Kalau ticket-service butuh nama event, bagaimana caranya tanpa JOIN ke event_db?  
**Jawaban:** Simpan `event_name` di tabel `orders` saat order dibuat (denormalisasi), atau fetch via REST API.

#### 2. PostgreSQL Connection Pool
```javascript
const pool = new Pool({
  max: 20,              // maksimal 20 koneksi simultan
  idleTimeoutMillis: 30000,  // tutup koneksi idle setelah 30 detik
  connectionTimeoutMillis: 5000,  // timeout kalau tidak bisa dapat koneksi
});
```

**Pertanyaan Refleksi:**
- Apa yang terjadi kalau `max` terlalu kecil saat war tiket? (Hint: koneksi antri)
- Kenapa kita harus selalu `client.release()` di `finally` block?

#### 3. Transaction dan Atomicity
```sql
-- Dari ticket-service: kunci kursi harus atomik
BEGIN;
  -- 1. kurangi available_seats
  UPDATE seat_categories SET available_seats = available_seats - 1 WHERE id = $1;
  -- 2. buat order
  INSERT INTO orders (...) VALUES (...);
COMMIT;
-- Kalau salah satu gagal → ROLLBACK → tidak ada state yang tanggung
```

**Latihan:** Tulis query yang mentransfer saldo antar user secara atomik.

#### 4. Index dan Performa Query
```sql
-- Index yang dibuat di ticket_db:
CREATE INDEX idx_orders_user_event ON orders(user_id, event_id);  -- cek duplikat
CREATE INDEX idx_orders_expires ON orders(lock_expires_at) WHERE status = 'locked';
```

**Pertanyaan:** Kenapa index `WHERE status = 'locked'` (partial index) lebih efisien dari index biasa?

#### 5. Seed Data yang Baik
```sql
-- Seed data harus mencakup semua state:
-- status=confirmed (sudah bayar)
-- status=locked    (sedang dipesan)
-- status=expired   (kedaluwarsa)
-- status=cancelled (dibatalkan)
```

**Pertanyaan:** Kenapa seed data penting untuk testing? Apa yang terjadi kalau seed data tidak realistis?

#### 6. Frontend sebagai "Wajah" Data
```javascript
// Kamu membangun loadEvents() yang:
async function loadEvents() {
  try {
    const res = await fetch(`${API}/catalog`);     // ambil dari DB via API
    allEvents = (await res.json()).data;             // tampilkan data real
  } catch (_) {
    allEvents = DEMO_EVENTS;                         // fallback ke demo data
  }
}
```

**Latihan:** Tambahkan pagination ke event grid — tampilkan 6 konser per halaman.

---

### 🚀 Tantangan Selanjutnya
1. **Database migration tool**: Pakai Flyway/Liquibase untuk version control skema DB
2. **Read replica**: Pisahkan read queries ke replica untuk performa lebih baik
3. **Data archiving**: Query orders yang expired lebih dari 30 hari → arsipkan ke tabel lain

---
---

## 👤 MARHEPI RAHMADANI (105841109523)
### Peran: QA, Load-Test & Dokumentasi

---

### 📖 Yang Kamu Kerjakan
- Mendokumentasikan arsitektur dan ERP dalam `arsitektur-war-tiket-konser.md` dan `struktur-erp-tasks.md`
- Melakukan load test: 200 request concurrent, mengukur p95/p99 latency
- Membuat `openapi.yaml` v1 yang mendokumentasikan semua endpoint
- Menyusun `LAPORAN.md` dan `SKRIP_VIDEO.md`
- Verifikasi bahwa angka load test benar-benar terukur (bukan sekadar klaim)

---

### 🧠 Konsep yang Perlu Kamu Kuasai

#### 1. OpenAPI Specification
```yaml
# openapi.yaml yang kamu buat:
openapi: "3.0.3"
paths:
  /orders:
    post:
      summary: Kunci kursi sementara
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateOrderRequest"
      responses:
        "201":
          description: Kursi berhasil dikunci
        "409":
          $ref: "#/components/responses/Conflict"
        "429":
          $ref: "#/components/responses/TooManyRequests"
```

**Pertanyaan:** Apa keuntungan mendefinisikan `$ref` alih-alih menduplikasi schema?

#### 2. Load Testing — Metrik yang Penting
```
p50  = latency di mana 50% request lebih cepat dari angka ini
p95  = latency di mana 95% request lebih cepat (yang dipakai untuk SLA)
p99  = latency di mana 99% request lebih cepat (outlier detector)
```

**Hasil load test kalian:**
```
Sebelum (tanpa gateway): p95=233ms, throughput=390 req/s
Sesudah (via gateway):   p95=153ms, throughput=440 req/s
```

**Pertanyaan Refleksi:**
- Kenapa p95 turun meskipun ada overhead gateway tambahan? (Hint: Redis cache)
- Kapan kita harus panik kalau p99 jauh lebih tinggi dari p95?

#### 3. Test Scenarios yang Harus Dicakup
```
Happy path:        user login → kunci kursi → bayar → tiket konfirmasi
Sad path:          kursi habis → user dapat 409 Conflict
Race condition:    1000 user klik bersamaan untuk 1 kursi → hanya 1 yang menang
Expiry:            order tidak dibayar 15 menit → otomatis expired
Rate limit:        10+ request/10 detik → user diblokir sementara
```

**Latihan:** Tulis test case untuk skenario "user mencoba beli tiket yang sama dua kali".

#### 4. Dokumentasi yang Baik vs Buruk
```markdown
# BURUK:
"Sistem ini fast dan reliable."

# BAIK:
"p95 latency: 153ms (200 request, 50 concurrent)
 Throughput: 440 req/s
 Error rate: 0%
 Rate-limited (bot diblokir): 100 dari 200 request"
```

**Prinsip:** Dokumentasi yang baik punya angka, bukan hanya klaim.

#### 5. API Contract sebagai Kontrak Tim
OpenAPI bukan hanya dokumentasi — ini adalah **kontrak** antara:
- Backend (yang membuat endpoint) 
- Frontend (yang memanggil endpoint)
- QA (yang menguji endpoint)
- Mobile dev (yang akan membangun app di atasnya)

**Pertanyaan:** Apa yang terjadi kalau backend mengubah response format tanpa update openapi.yaml?

#### 6. Laporan Teknis yang Baik
Laporan kamu harus menjawab 3 hal:
1. **Apa yang dirancang?** → arsitektur, keputusan teknis (ADR)
2. **Apa yang diukur?** → angka konkret dari load test
3. **Apa yang dipelajari?** → lesson learned, apa yang akan diubah kalau ulang

---

### 🚀 Tantangan Selanjutnya
1. **Automated testing**: Tulis Jest test untuk `GET /catalog` — pastikan return 200 dengan data
2. **k6 load test**: Instal k6, jalankan test dengan 1000 VU (virtual user) selama 30 detik
3. **API documentation portal**: Deploy openapi.yaml ke Swagger UI atau Redoc

---
---

## 👤 MIFTAHUL JANNAH (105841116023)
### Peran: Arsitek Sistem

---

### 📖 Yang Kamu Kerjakan
- Merancang arsitektur 6-service microservices (event, ticket, payment, notification, api-gateway, erp)
- Memutuskan strategi anti-oversell: Redis SET NX EX sebagai distributed lock
- Merancang Saga choreography pattern via RabbitMQ untuk koordinasi antar service
- Mendefinisikan 5 ADR (Architecture Decision Records)
- Merancang lapisan Rate Limiting dengan sliding window counter di Redis

---

### 🧠 Konsep yang Perlu Kamu Kuasai

#### 1. Architecture Decision Records (ADR)
Kamu membuat 5 ADR yang menjelaskan MENGAPA, bukan hanya APA:

```markdown
# ADR-001: Redis SET NX EX sebagai Distributed Lock

Status: Accepted

Konteks: Ratusan ribu request bersamaan untuk 1 kursi.

Keputusan: Gunakan Redis atomic command SET NX EX.

Konsekuensi:
+ O(1) per request, sangat cepat
+ TTL otomatis melepas lock
- Redis menjadi single point of failure
```

**Pertanyaan:** Apa ADR yang akan kamu tulis kalau memilih PostgreSQL vs MongoDB?

#### 2. Distributed Lock dengan Redis
```javascript
// Yang kamu rancang, diimplementasikan di seat-lock.service.js:
async function acquireLock(key, ttlMs = 10000) {
  const lockKey = `lock:seat:${key}`;
  const token   = uuidv4();
  // SET key value NX EX ttl — atomic, hanya berhasil sekali
  const result  = await redis.set(lockKey, token, 'PX', ttlMs, 'NX');
  return result === 'OK' ? { lockKey, token } : null;
}

// Release lock: hanya boleh dilakukan oleh pemilik lock (Lua script atomic)
async function releaseLock(lockKey, token) {
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else return 0 end
  `;
  await redis.eval(script, 1, lockKey, token);
}
```

**Pertanyaan Mendalam:**
- Kenapa kita butuh Lua script untuk release lock, tidak cukup DEL?
- Apa yang terjadi kalau service crash setelah SET tapi sebelum RELEASE?

#### 3. Saga Pattern (Choreography)
```
ticket.locked ──→ payment-service (buat order)
                           │
                    bayar berhasil?
                    ┌──── YA ────┐
                    ↓            ↓
            payment.confirmed  payment.failed
                    ↓            ↓
            ticket-service    ticket-service
            (konfirmasi)      (cancel/rollback)
                    ↓            
            ticket.confirmed   
                    ↓
            notification-service
            (kirim e-ticket)
```

**Pertanyaan:** Bagaimana kita tahu kalau Saga sudah selesai? Apa itu "eventual consistency"?

#### 4. Lapisan Perlindungan Anti-Oversell
```
Layer 1: Rate-limit (api-gateway)    → blokir bot & spam
Layer 2: Redis SET NX EX             → atomic lock, 1 winner
Layer 3: PostgreSQL SELECT FOR UPDATE → row-level lock di DB
Layer 4: UNIQUE constraint (DB)      → hard stop, tidak bisa oversell
```

**Pertanyaan:** Kalau Layer 1-3 gagal semua, apakah Layer 4 masih bisa mencegah oversell?

#### 5. Trade-offs dalam Arsitektur
Setiap keputusan arsitektur punya trade-off:

| Keputusan | Keuntungan | Kerugian |
|---|---|---|
| Database per service | Independent deploy | Tidak bisa JOIN |
| Kafka async | Decoupled, retry-able | Eventually consistent |
| Redis lock | Sangat cepat | Redis jadi SPOF |
| Saga choreography | Tidak ada orchestrator | Sulit di-debug |

**Latihan:** Jelaskan mengapa "eventually consistent" bisa diterima untuk notifikasi tapi TIDAK diterima untuk kunci kursi.

#### 6. Capacity Planning
```
Asumsi: 10.000 user mencoba war tiket secara bersamaan
- Tiap user mengirim 1 req/detik selama 5 menit
- Total: 10.000 × 300 = 3.000.000 request

Butuh:
- api-gateway: rate limit 100 req/60s per user → hanya 10.000 × ~1.6 req/s yang diteruskan
- ticket-service: max 100 order lock/detik (Redis bottleneck)
- PostgreSQL: max 30 connection pool × avg 50ms per query = 600 req/s
```

**Pertanyaan:** Kalau konser ada 5000 kursi dan kamu butuh jual habis dalam 1 menit, berapa throughput minimum yang dibutuhkan?

---

### 🚀 Tantangan Selanjutnya
1. **Redlock algorithm**: Implementasi distributed lock yang lebih robust dengan 5 Redis node
2. **Event sourcing**: Simpan setiap perubahan sebagai event, bukan state langsung
3. **CQRS**: Pisahkan Command (write) dan Query (read) ke service yang berbeda
4. **Service mesh**: Implementasi Istio untuk observability dan traffic management

---
---

## 🎯 Refleksi Bersama — Apa yang Kelompok 5 Pelajari

### Pelajaran Teknis
1. **Distributed system itu kompleks** — race condition, network failure, partial failure adalah hal biasa
2. **Redis bukan hanya cache** — bisa jadi distributed lock, rate limiter, pub/sub
3. **Database transaction bukan magic** — harus dirancang dengan hati-hati
4. **Dokumentasi = produk** — openapi.yaml, ADR, dan laporan adalah bagian dari deliverable

### Pelajaran Non-Teknis
1. **Monorepo + Docker mempermudah onboarding** — `docker compose up -d` dan semua berjalan
2. **Co-authorship di git** — kode bisa dilacak kontribusinya
3. **Commit message yang deskriptif** — `feat(ticket): add Redis NX EX lock` jauh lebih berguna dari `update code`
4. **Test dengan data real** — bukan hanya demo mode

### Statistik Proyek
| Metrik | Angka |
|---|---|
| Total service | 6 (event, ticket, payment, notification, api-gateway, erp) |
| Total endpoint API | 25+ endpoint |
| Lapisan anti-oversell | 4 lapisan |
| Background jobs | 4 (expire-reservation, expire-order, retry-notif, generate-revenue-report) |
| Load test p95 | 153ms (sesudah gateway + cache) |
| Bot diblokir | 50% request (rate-limit bekerja) |

---

## 📖 Referensi Bacaan Lanjutan

### Untuk Ashabul Kahfi (Backend/API)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [REST API Design — Microsoft Guidelines](https://docs.microsoft.com/en-us/azure/architecture/best-practices/api-design)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)

### Untuk Jusriadi Liwang (Data & Frontend)
- [PostgreSQL EXPLAIN ANALYZE](https://www.postgresql.org/docs/current/sql-explain.html)
- [Database per Service Pattern](https://microservices.io/patterns/data/database-per-service.html)
- [JavaScript Async/Await Deep Dive](https://javascript.info/async-await)

### Untuk Marhepi Rahmadani (QA & Dokumentasi)
- [OpenAPI Specification Guide](https://swagger.io/specification/)
- [k6 Load Testing](https://k6.io/docs/)
- [Google SRE Book — Measuring Service Risk](https://sre.google/sre-book/embracing-risk/)

### Untuk Miftahul Jannah (Arsitek)
- [Designing Data-Intensive Applications (Martin Kleppmann)](https://dataintensive.net/)
- [Microservices Patterns (Chris Richardson)](https://microservices.io/book)
- [Redis Distributed Locks](https://redis.io/docs/manual/patterns/distributed-locks/)
- [Saga Pattern](https://microservices.io/patterns/data/saga.html)
