# AI-LOG.md — Catatan Penggunaan AI

> **Proyek**: WarTiket — Platform Tiket Konser Microservices
> **Kelompok**: 5 · Kelas A · Praktikum Microservices
> **Repo**: https://github.com/Jusriadiliwang/Lab-kelompok-05-tiket

## Log Penggunaan AI

### Sesi 1 — Desain Skema Database
**Tanggal**: 2026-08-10 | **Tool**: ChatGPT (GPT-4o)
**Prompt**: Buatkan skema database PostgreSQL untuk 4 microservice: event-service, ticket-service, payment-service, notification-service.
**Dipakai**: Skema tabel events, seat_categories, orders, tickets, payments, notifications.
**Dimodifikasi**: Ya — ditambah kolom locked_until dan status enum.

### Sesi 2 — Docker Compose
**Tanggal**: 2026-08-12 | **Tool**: GitHub Copilot
**Prompt**: Tambahkan health check untuk postgres di docker-compose.yml
**Dipakai**: Blok healthcheck di service db.
**Dimodifikasi**: Ya — ubah interval dan timeout.

### Sesi 3 — OpenAPI Spec
**Tanggal**: 2026-08-13 | **Tool**: ChatGPT (GPT-4o)
**Prompt**: Buatkan OpenAPI 3.0 spec untuk POST /orders, GET /catalog, POST /payments, GET /events/{id}/seats, GET /orders/{id}.
**Dipakai**: Kerangka openapi.yaml.
**Dimodifikasi**: Ya — sesuaikan nama field dengan implementasi aktual.

### Sesi 4 — SQL Seed Data
**Tanggal**: 2026-08-14 | **Tool**: ChatGPT (GPT-4o)
**Prompt**: Buatkan SQL INSERT untuk 6 konser: Dewa 19, Coldplay, EDC Jakarta, Raisa, Sound Drenaline, BTS.
**Dipakai**: Data seed di db-init/01_seed_events.sql.
**Dimodifikasi**: Ya — sesuaikan harga dan jumlah kursi.

### Sesi 5 — Frontend UI
**Tanggal**: 2026-08-15 | **Tool**: Claude + GitHub Copilot
**Prompt**: Buat halaman web single-page untuk WAR TIKET dengan fitur katalog, pilih kursi, countdown, pembayaran.
**Dipakai**: Kerangka layout, CSS, fungsi fetch API.
**Dimodifikasi**: Ya — tambah demo mode, hero carousel, search & filter.

### Sesi 6 — Debug Docker Network
**Tanggal**: 2026-08-17 | **Tool**: ChatGPT (GPT-4o)
**Masalah**: Service tidak bisa reach service lain. Error: ECONNREFUSED.
**Dipakai**: Saran depends_on dengan service_healthy.
**Dimodifikasi**: Ya — ganti links (deprecated) dengan networks eksplisit.

## Ringkasan

| # | Tanggal    | Tool    | Kegunaan                   | Dimodifikasi |
|---|------------|---------|----------------------------|:-------------|
| 1 | 2026-08-10 | ChatGPT | Skema database 4 service   | Ya           |
| 2 | 2026-08-12 | Copilot | Docker Compose healthcheck | Ya           |
| 3 | 2026-08-13 | ChatGPT | OpenAPI spec               | Ya           |
| 4 | 2026-08-14 | ChatGPT | SQL seed data              | Ya           |
| 5 | 2026-08-15 | Claude  | Frontend UI                | Ya           |
| 6 | 2026-08-17 | ChatGPT | Debug Docker network       | Ya           |

Semua output AI dimodifikasi sebelum dipakai — tidak ada copy-paste mentah.
