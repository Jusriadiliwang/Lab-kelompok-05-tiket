# 🎬 SKRIP VIDEO DEMO
## War Tiket Konser — Kelompok 5 Microservices Lab

**Durasi target:** 3–5 menit  
**URL Demo:** http://localhost:8080  
**Narator:** (Sesuaikan nama)

---

## 🎙️ INTRO (0:00 – 0:20)

> *"Halo, kami Kelompok 5 dari praktikum Microservices,
> Universitas Muhammadiyah Makassar.*
>
> *Kami membangun sistem War Tiket Konser —
> platform jual tiket yang mampu melayani puluhan ribu pengguna
> secara bersamaan, tanpa ada kursi yang terjual dua kali.*
>
> *Sistem ini dibangun dengan 6 microservice yang berjalan
> di atas Docker. Mari kami tunjukkan cara kerjanya."*

**[TAMPILKAN: Halaman http://localhost:8080 — hero carousel dengan konser real]**

---

## 🎵 BAGIAN 1 — Tampilan Utama (0:20 – 0:50)

> *"Ini adalah halaman utama War Tiket.*
>
> *Semua data konser yang terlihat di sini adalah data real
> dari database PostgreSQL yang berjalan di Docker.*
>
> *Ada 3 konser aktif: Konser Dewa 19 Reuni,
> Blackpink World Tour Jakarta, dan Slipknot Download Festival.*
>
> *Di bagian statistik, kita bisa lihat ada 2 konser on sale
> dengan total 17 ribu lebih kursi tersedia."*

**[TAMPILKAN: Scroll ke event grid — tampil 3 konser]**
**[TAMPILKAN: Statistik — 2 konser aktif, 17.9K kursi]**

---

## 🔐 BAGIAN 2 — Login User (0:50 – 1:10)

> *"Untuk membeli tiket, pengguna perlu login terlebih dahulu.*
>
> *Kita klik tombol Masuk, isi User ID,
> lalu klik Masuk dan Mulai WAR.*
>
> *Di balik layar, sistem meminta JWT token dari API Gateway
> di port 3000. Token ini digunakan untuk memvalidasi
> semua request berikutnya."*

**[AKSI: Klik Masuk → isi User ID → klik login]**
**[TAMPILKAN: Toast "Selamat datang!" + navbar berubah]**

---

## 🎫 BAGIAN 3 — Pilih Konser & Kursi (1:10 – 1:45)

> *"Sekarang kita klik Konser Dewa 19 Reuni.*
>
> *Di sini terlihat tiga kategori kursi dengan harga berbeda:
> Festival 350 ribu, VIP 750 ribu, dan VVIP 2,5 juta.*
>
> *Jumlah kursi yang terlihat ini adalah data real-time
> dari database — setiap pembelian langsung mengurangi
> stok yang tersedia.*
>
> *Kita pilih Festival, lalu klik WAR TIKET SEKARANG!"*

**[AKSI: Klik event card → modal terbuka]**
**[TAMPILKAN: 3 kategori dengan harga dan stok real]**
**[AKSI: Pilih Festival → klik WAR TIKET SEKARANG]**

---

## ⚡ BAGIAN 4 — Proses Kunci Kursi (1:45 – 2:15)

> *"Di balik layar, saat tombol ditekan,
> ticket-service menjalankan Redis SET NX EX —
> perintah atomic yang hanya bisa dimenangkan satu request.*
>
> *Ini adalah lapisan perlindungan utama anti-oversell:
> walau 1000 user menekan tombol bersamaan,
> hanya satu yang mendapat kursi.*
>
> *Lihat — muncul modal pembayaran dengan Order ID nyata
> dari database. Ada countdown 15 menit untuk bayar."*

**[TAMPILKAN: Payment modal dengan Order ID real dari DB]**
**[TAMPILKAN: Countdown timer berjalan]**
**[TAMPILKAN: Detail: Event, Kategori, Total Rp 350.000]**

---

## 💳 BAGIAN 5 — Pembayaran (2:15 – 2:45)

> *"Pilih metode pembayaran — GoPay, OVO, DANA,
> Transfer Bank, atau Kartu Kredit.*
>
> *Kita pilih GoPay, lalu klik Bayar Sekarang.*
>
> *Payment service memproses pembayaran dan
> mempublikasikan event ke message broker RabbitMQ.*
>
> *Ticket service consume event tersebut,
> mengkonfirmasi reservasi, dan membuat tiket resmi."*

**[AKSI: Klik GoPay → klik Bayar Sekarang]**
**[TAMPILKAN: Loading → toast "Pembayaran berhasil!"]**

---

## 🎟️ BAGIAN 6 — Tiket Terkonfirmasi (2:45 – 3:15)

> *"Klik Tiket Saya di navbar untuk melihat tiket.*
>
> *Status sudah CONFIRMED — tiket resmi sudah diterbitkan.*
>
> *Ada QR code unik yang bisa digunakan sebagai
> bukti masuk ke venue.*
>
> *Data ini tersimpan permanen di PostgreSQL —
> tidak bisa dihapus atau dimanipulasi."*

**[AKSI: Klik Tiket Saya]**
**[TAMPILKAN: Tiket card dengan status CONFIRMED + QR code]**
**[ZOOM: QR code dan kode tiket]**

---

## 🔔 BAGIAN 7 — Notifikasi (3:15 – 3:35)

> *"Notification service juga mengirimkan notifikasi
> secara otomatis via RabbitMQ.*
>
> *Klik ikon notifikasi di navbar —
> tampil pemberitahuan bahwa tiket sudah dikonfirmasi.*
>
> *Ini membuktikan ketiga lapisan bekerja bersama:
> Frontend → API Gateway → Microservices → Database."*

**[AKSI: Klik ikon notifikasi]**
**[TAMPILKAN: Notifikasi tiket confirmed]**

---

## 🛡️ BAGIAN 8 — Anti-Oversell (3:35 – 4:00) [OPSIONAL]

> *"Untuk membuktikan sistem anti-oversell bekerja,
> coba kunci kursi yang sama dari user berbeda.*
>
> *Sistem langsung menolak dengan pesan
> '409 Duplicate Order' — kursi tidak bisa dikunci dua kali.*
>
> *Ini dijaga oleh 4 lapis: Redis lock, Redis cache,
> PostgreSQL SELECT FOR UPDATE, dan UNIQUE constraint."*

**[TAMPILKAN: Coba order yang sama → error 409]**

---

## 🏢 BAGIAN 9 — Admin Panel ERP (4:00 – 4:30) [OPSIONAL]

> *"Sistem juga dilengkapi ERP back-office.*
>
> *Klik logo 5 kali untuk akses admin panel.*
>
> *Di sini admin bisa kelola event, pantau revenue,
> lihat analitik conversion rate, dan audit trail.*
>
> *Semua aksi admin tercatat di log yang tidak bisa diubah."*

**[AKSI: Klik logo 5x → login admin@wartiket.id]**
**[TAMPILKAN: Dashboard ERP dengan data real]**

---

## 🎤 PENUTUP (4:30 – 4:50)

> *"Itu tadi demo lengkap War Tiket Konser —
> sistem microservices yang mampu menangani lonjakan traffic,
> mencegah oversell, dan memberikan pengalaman belanja tiket
> yang adil dan cepat.*
>
> *Terima kasih. Kelompok 5 —
> Jusriadi Liwang, Ashabul Kahfi,
> Miftahul Jannah, dan Marhepi Rahmadani."*

**[TAMPILKAN: Halaman utama dengan semua konser]**
**[FADE OUT]**

---

## 📋 Checklist Sebelum Rekam

- [ ] `docker compose up -d` sudah dijalankan
- [ ] Buka `http://localhost:8080` — events tampil (bukan demo data)
- [ ] Resolusi layar: minimal 1280×720
- [ ] Microphone aktif (atau voice-over belakang)
- [ ] Browser zoom 100% (Ctrl+0)
- [ ] Hapus notifikasi lama: buka DevTools → localStorage.clear() → refresh
