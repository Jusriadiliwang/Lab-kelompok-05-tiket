# 📚 Dokumentasi Individu — Kelompok 5
## War Tiket Konser | Praktikum Microservices
**Universitas Muhammadiyah Makassar**  
**Repository:** https://github.com/Jusriadiliwang/Lab-kelompok-05-tiket

---

## 👥 Anggota & Dokumen

| Nama | NIM | Peran | Commit Utama | Dokumen |
|---|---|---|---|---|
| Ashabul Kahfi | 105841108523 | Backend / API Engineer | 16+ commit (api-gateway, erp, consumers, mobile) | [ASHABUL_KAHFI.md](./ASHABUL_KAHFI.md) |
| Jusriadi Liwang | 105841117023 | Data & Persistence + Frontend | 7+ commit (db-init, frontend, docker-compose) | [JUSRIADI_LIWANG.md](./JUSRIADI_LIWANG.md) |
| Marhepi Rahmadani | 105841109523 | QA, Load Test & Dokumentasi | 2 commit (load-test, panduan-api) | [MARHEPI_RAHMADANI.md](./MARHEPI_RAHMADANI.md) |
| Miftahul Jannah | 105841116023 | Arsitek Sistem | 4+ commit (arsitektur, README, ERP design) | [MIFTAHUL_JANNAH.md](./MIFTAHUL_JANNAH.md) |

---

## 🎯 Capaian Bersama

- ✅ 6 microservice berjalan di Docker
- ✅ Anti-oversell 4 lapis (Rate-limit → Redis NX EX → PostgreSQL → UNIQUE)
- ✅ ERP back-office M1–M6 + RBAC + Audit Trail
- ✅ Frontend SPA + GitHub Pages
- ✅ Mobile App Expo (React Native)
- ✅ Load test real: p95=167ms, throughput=440 req/s, error=0%

---

## 📋 Mapping Commit → Anggota

| Commit | Author Sebenarnya | Kontribusi |
|---|---|---|
| `c05afeb` | Jusriadi Liwang | Initial microservices scaffold |
| `956924d` | Jusriadi Liwang | Schema fixes + seed data |
| `589fb41` | Jusriadi Liwang | Frontend web UI |
| `24e8dfe` | Jusriadi Liwang | GitHub Pages deploy |
| `08a93ce` | **Miftahul Jannah** | Arsitektur sistem + ADR |
| `5bb915d` | Ashabul Kahfi | API Gateway (JWT + rate-limit) |
| `323ce0e` | Ashabul Kahfi | Payment/ticket consumers (Saga) |
| `13d5edf` | Ashabul Kahfi | ERP service M1–M6 |
| `246b9eb` | Ashabul Kahfi | Redis catalog cache |
| `e4b10cd` | Ashabul Kahfi | LAPORAN.md |
| `40fbab2` | Ashabul Kahfi | Mobile screens (Profile, Queue, Register) |
| `94d6c38` | Marhepi Rahmadani | Load test script + panduan API |
| `b053aeb` | Marhepi Rahmadani | Hasil test data real |

---

*Kelompok 5 | Praktikum Microservices | Universitas Muhammadiyah Makassar*

## War Tiket Konser | Praktikum Microservices
**Universitas Muhammadiyah Makassar**  
**Repository:** https://github.com/Jusriadiliwang/Lab-kelompok-05-tiket

---

## 👥 Anggota & Dokumen Masing-Masing

| Nama | NIM | Peran | Dokumen |
|---|---|---|---|
| Ashabul Kahfi | 105841108523 | Backend / API Engineer | [ASHABUL_KAHFI.md](./ASHABUL_KAHFI.md) |
| Jusriadi Liwang | 105841117023 | Data & Persistence Engineer, Frontend | [JUSRIADI_LIWANG.md](./JUSRIADI_LIWANG.md) |
| Marhepi Rahmadani | 105841109523 | QA, Load Test & Dokumentasi | [MARHEPI_RAHMADANI.md](./MARHEPI_RAHMADANI.md) |
| Miftahul Jannah | 105841116023 | Arsitek Sistem | [MIFTAHUL_JANNAH.md](./MIFTAHUL_JANNAH.md) |

---

## 🗂️ Ringkasan Peran

### 🏗️ Miftahul Jannah — Arsitek Sistem
Merancang arsitektur 6-service, mendefinisikan 5 ADR (Architecture Decision Records), strategi anti-oversell 4 lapis, desain ERP & RBAC, dan sprint plan 8 minggu.

### 🗄️ Jusriadi Liwang — Data & Persistence + Frontend
Membangun fondasi awal 4 microservice, merancang seluruh skema PostgreSQL + seed data realistis, membangun frontend SPA 91KB (event grid, seat picker, admin panel), deployment GitHub Pages.

### ⚙️ Ashabul Kahfi — Backend / API Engineer
Mengimplementasikan seluruh business logic, API Gateway (JWT + rate-limit + cache), integrasi RabbitMQ (producers & consumers), ERP back-office M1–M6, dan background jobs.

### 📊 Marhepi Rahmadani — QA, Load Test & Dokumentasi
Merancang & menjalankan load test (p95 turun 34%, throughput naik 13%), verifikasi end-to-end dengan data real di PostgreSQL, co-author openapi.yaml v2, LAPORAN.md, SKRIP_VIDEO.md.

---

## 🎯 Capaian Bersama

- ✅ 6 microservice berjalan di Docker (api-gateway, event, ticket, payment, notification, erp)
- ✅ Anti-oversell 4 lapis (Rate-limit → Redis NX EX → SELECT FOR UPDATE → UNIQUE constraint)
- ✅ ERP back-office lengkap (M1–M6, RBAC 5 role, Audit Trail immutable)
- ✅ Frontend SPA dengan hero carousel, event grid, seat picker, e-ticket QR code
- ✅ Load test: p95 latency turun 34%, throughput naik 13%
- ✅ Deployment di GitHub Pages & Docker Compose

---

## 📁 Struktur Folder Dokumentasi

```
docs/
├── anggota/                       ← Dokumen individu (folder ini)
│   ├── README.md                  ← Indeks ini
│   ├── ASHABUL_KAHFI.md
│   ├── JUSRIADI_LIWANG.md
│   ├── MARHEPI_RAHMADANI.md
│   └── MIFTAHUL_JANNAH.md
├── arsitektur-war-tiket-konser.md ← Arsitektur sistem lengkap
├── struktur-erp-tasks.md          ← ERP design & sprint plan
├── diagrams.html                  ← Diagram visual interaktif
├── index.html                     ← Frontend (GitHub Pages)
└── adr/                           ← Architecture Decision Records
```

---

*Kelompok 5 | Praktikum Microservices | Universitas Muhammadiyah Makassar*
