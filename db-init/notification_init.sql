-- ================================================================
-- notification-service database schema
-- Kelompok 5 — War Tiket Konser
-- Tanggung jawab: Jusriadi Liwang (Data & Persistence Engineer)
-- ================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id         SERIAL PRIMARY KEY,
    user_id    VARCHAR(255) NOT NULL,
    type       VARCHAR(100) NOT NULL
               CHECK (type IN (
                   'ticket_confirmed',
                   'eticket',
                   'payment_failed',
                   'payment_refunded',   -- refund setelah pembayaran berhasil dibatalkan
                   'order_expiring',
                   'order_cancelled'     -- pembatalan manual oleh user
               )),
    title      VARCHAR(255) NOT NULL,
    message    TEXT NOT NULL,
    is_read    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()  -- track kapan is_read diubah
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications(user_id, is_read);

-- ── Seed data untuk demo ──────────────────────────────────────
-- Notifikasi mencakup semua 6 type yang valid di CHECK constraint
-- Setiap skenario user menghasilkan notif yang sesuai

INSERT INTO notifications
    (id, user_id, type, title, message, is_read, created_at, updated_at)
VALUES
    -- ── user_001: confirmed Dewa19 Festival ──────────────────
    (1, 'user_001', 'ticket_confirmed',
     'Tiket Berhasil Dikonfirmasi!',
     'Selamat! Tiket kamu untuk Konser Dewa 19 Reuni (Festival - Kursi SEAT-1) sudah dikonfirmasi. QR Code: QR-11111111-0001-4000-a000-000000000001',
     TRUE,
     NOW() - INTERVAL '1 day 23 hours',
     NOW() - INTERVAL '1 day 20 hours'),

    (2, 'user_001', 'eticket',
     'E-Tiket Kamu',
     'E-Tiket untuk Konser Dewa 19 Reuni. QR: QR-11111111-0001-4000-a000-000000000001. Tunjukkan ini di pintu masuk.',
     TRUE,
     NOW() - INTERVAL '1 day 23 hours',
     NOW() - INTERVAL '1 day 20 hours'),

    -- ── user_002: confirmed Blackpink Festival ───────────────
    (3, 'user_002', 'ticket_confirmed',
     'Tiket Berhasil Dikonfirmasi!',
     'Selamat! Tiket kamu untuk Blackpink World Tour Jakarta (Festival - Kursi SEAT-2) sudah dikonfirmasi. QR Code: QR-22222222-0002-4000-a000-000000000002',
     FALSE,
     NOW() - INTERVAL '23 hours 55 minutes',
     NOW() - INTERVAL '23 hours 55 minutes'),

    (4, 'user_002', 'eticket',
     'E-Tiket Kamu',
     'E-Tiket untuk Blackpink World Tour Jakarta. QR: QR-22222222-0002-4000-a000-000000000002. Tunjukkan ini di pintu masuk.',
     FALSE,
     NOW() - INTERVAL '23 hours 55 minutes',
     NOW() - INTERVAL '23 hours 55 minutes'),

    -- ── user_003: expired VIP Dewa19 ─────────────────────────
    (5, 'user_003', 'order_expiring',
     'Pesanan Kedaluwarsa',
     'Pesananmu untuk Konser Dewa 19 Reuni (Order #3) sudah kedaluwarsa karena tidak dibayar. Kursi telah dilepas.',
     FALSE,
     NOW() - INTERVAL '3 days',
     NOW() - INTERVAL '3 days'),

    -- ── user_004: cancelled Festival Slipknot ────────────────
    (6, 'user_004', 'order_cancelled',
     'Pesanan Dibatalkan',
     'Pesananmu #4 telah dibatalkan. Kursi telah dilepas kembali ke sistem.',
     TRUE,
     NOW() - INTERVAL '4 hours 30 minutes',
     NOW() - INTERVAL '4 hours'),

    -- ── user_005: expired VIP Blackpink (payment failed) ─────
    (7, 'user_005', 'payment_failed',
     'Pembayaran Gagal',
     'Pembayaranmu untuk order #5 gagal diproses. Kursi masih terkunci. Coba bayar lagi sebelum waktu habis.',
     FALSE,
     NOW() - INTERVAL '1 day 13 minutes',
     NOW() - INTERVAL '1 day 13 minutes'),

    (8, 'user_005', 'order_expiring',
     'Pesanan Kedaluwarsa',
     'Pesananmu untuk Blackpink World Tour Jakarta (Order #5) sudah kedaluwarsa karena tidak dibayar. Kursi telah dilepas.',
     FALSE,
     NOW() - INTERVAL '1 day',
     NOW() - INTERVAL '1 day'),

    -- ── user_006: confirmed VVIP Dewa19 ──────────────────────
    (9, 'user_006', 'ticket_confirmed',
     'Tiket Berhasil Dikonfirmasi!',
     'Selamat! Tiket kamu untuk Konser Dewa 19 Reuni (VVIP - Kursi SEAT-6) sudah dikonfirmasi. QR Code: QR-66666666-0006-4000-a000-000000000006',
     FALSE,
     NOW() - INTERVAL '3 hours 48 minutes',
     NOW() - INTERVAL '3 hours 48 minutes'),

    (10, 'user_006', 'eticket',
     'E-Tiket Kamu',
     'E-Tiket untuk Konser Dewa 19 Reuni. QR: QR-66666666-0006-4000-a000-000000000006. Tunjukkan ini di pintu masuk.',
     FALSE,
     NOW() - INTERVAL '3 hours 48 minutes',
     NOW() - INTERVAL '3 hours 48 minutes'),

    -- ── user_007: confirmed VIP Dewa19 → lalu refund ─────────
    (11, 'user_007', 'ticket_confirmed',
     'Tiket Berhasil Dikonfirmasi!',
     'Selamat! Tiket kamu untuk Konser Dewa 19 Reuni (VIP - Kursi SEAT-7) sudah dikonfirmasi. QR Code: QR-77777777-0007-4000-a000-000000000007',
     TRUE,
     NOW() - INTERVAL '4 hours 55 minutes',
     NOW() - INTERVAL '4 hours'),

    (12, 'user_007', 'eticket',
     'E-Tiket Kamu',
     'E-Tiket untuk Konser Dewa 19 Reuni. QR: QR-77777777-0007-4000-a000-000000000007. Tunjukkan ini di pintu masuk.',
     TRUE,
     NOW() - INTERVAL '4 hours 55 minutes',
     NOW() - INTERVAL '4 hours'),

    (13, 'user_007', 'payment_refunded',
     'Refund Diproses',
     'Refund sebesar Rp 750.000 untuk pembayaran #5 sedang diproses.',
     FALSE,
     NOW() - INTERVAL '2 hours',
     NOW() - INTERVAL '2 hours'),

    -- ── user_008: confirmed VIP Slipknot ─────────────────────
    (14, 'user_008', 'ticket_confirmed',
     'Tiket Berhasil Dikonfirmasi!',
     'Selamat! Tiket kamu untuk Slipknot Download Festival (VIP - Kursi SEAT-8) sudah dikonfirmasi. QR Code: QR-88888888-0008-4000-a000-000000000008',
     TRUE,
     NOW() - INTERVAL '11 hours 29 minutes',
     NOW() - INTERVAL '10 hours'),

    (15, 'user_008', 'eticket',
     'E-Tiket Kamu',
     'E-Tiket untuk Slipknot Download Festival. QR: QR-88888888-0008-4000-a000-000000000008. Tunjukkan ini di pintu masuk.',
     TRUE,
     NOW() - INTERVAL '11 hours 29 minutes',
     NOW() - INTERVAL '10 hours'),

    -- ── user_009: confirmed VVIP Blackpink ───────────────────
    (16, 'user_009', 'ticket_confirmed',
     'Tiket Berhasil Dikonfirmasi!',
     'Selamat! Tiket kamu untuk Blackpink World Tour Jakarta (VVIP - Kursi SEAT-9) sudah dikonfirmasi. QR Code: QR-99999999-0009-4000-a000-000000000009',
     FALSE,
     NOW() - INTERVAL '2 hours 28 minutes',
     NOW() - INTERVAL '2 hours 28 minutes'),

    (17, 'user_009', 'eticket',
     'E-Tiket Kamu',
     'E-Tiket untuk Blackpink World Tour Jakarta. QR: QR-99999999-0009-4000-a000-000000000009. Tunjukkan ini di pintu masuk.',
     FALSE,
     NOW() - INTERVAL '2 hours 28 minutes',
     NOW() - INTERVAL '2 hours 28 minutes')

ON CONFLICT DO NOTHING;

SELECT setval('notifications_id_seq', (SELECT MAX(id) FROM notifications));
