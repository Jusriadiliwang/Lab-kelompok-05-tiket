-- ================================================================
-- ticket-service database schema
-- Kelompok 5 — War Tiket Konser
-- Tanggung jawab: Jusriadi Liwang (Data & Persistence Engineer)
-- ================================================================

CREATE TABLE IF NOT EXISTS orders (
    id               SERIAL PRIMARY KEY,
    user_id          VARCHAR(255) NOT NULL,
    event_id         INTEGER NOT NULL,
    seat_category_id INTEGER NOT NULL,
    event_name       VARCHAR(255),
    seat_category_name VARCHAR(100),
    price            NUMERIC(12,2) NOT NULL,
    status           VARCHAR(50) NOT NULL DEFAULT 'locked'
                     CHECK (status IN ('locked','confirmed','cancelled','expired')),
    lock_expires_at  TIMESTAMP NOT NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tickets (
    id            SERIAL PRIMARY KEY,
    order_id      INTEGER NOT NULL REFERENCES orders(id),
    user_id       VARCHAR(255) NOT NULL,
    event_name    VARCHAR(255),
    seat_category VARCHAR(100),
    seat_number   VARCHAR(50) UNIQUE,     -- unik global; di-generate dari order_id
    qr_code       VARCHAR(500) UNIQUE,    -- unik global; UUID-based
    status        VARCHAR(50) NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','used','cancelled')),
    issued_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),  -- track kapan status berubah
    CONSTRAINT uq_tickets_order UNIQUE (order_id)   -- satu tiket per order
);

-- Index untuk performa
CREATE INDEX IF NOT EXISTS idx_orders_user       ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_event ON orders(user_id, event_id);   -- duplicate-check query
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_expires    ON orders(lock_expires_at) WHERE status = 'locked';
CREATE INDEX IF NOT EXISTS idx_tickets_user      ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_order     ON tickets(order_id);

-- ── Seed data untuk demo ──────────────────────────────────────
-- 10 orders: mencakup semua status (confirmed, locked, expired, cancelled)
-- 6 tickets: hanya untuk order yang status=confirmed
--
-- Pemetaan user & skenario:
--   user_001 — Festival Dewa 19   → confirmed  (sudah bayar, tiket aktif)
--   user_002 — Festival Blackpink → confirmed  (sudah bayar, tiket aktif)
--   user_003 — VIP Dewa 19        → expired    (tidak bayar, kursi sudah kembali)
--   user_004 — Festival Slipknot  → cancelled  (batalkan manual, kursi kembali)
--   user_005 — VIP Blackpink      → expired    (pembayaran gagal, lalu expire)
--   user_006 — VVIP Dewa 19       → confirmed  (sudah bayar, tiket aktif)
--   user_007 — VIP Dewa 19        → confirmed  (sudah bayar, lalu payment di-refund)
--   user_008 — VIP Slipknot       → confirmed  (sudah bayar, tiket aktif)
--   user_009 — VVIP Blackpink     → confirmed  (sudah bayar, tiket aktif)
--   user_010 — Festival Dewa 19   → locked     (baru pesan, belum bayar — 12 menit tersisa)

INSERT INTO orders
    (id, user_id, event_id, seat_category_id,
     event_name, seat_category_name, price,
     status, lock_expires_at, created_at, updated_at)
VALUES
    (1, 'user_001', 1, 3,
     'Konser Dewa 19 Reuni', 'Festival', 350000.00,
     'confirmed',
     NOW() - INTERVAL '1 day 13 minutes',
     NOW() - INTERVAL '2 days',
     NOW() - INTERVAL '2 days'),

    (2, 'user_002', 2, 6,
     'Blackpink World Tour Jakarta', 'Festival', 450000.00,
     'confirmed',
     NOW() - INTERVAL '23 hours 10 minutes',
     NOW() - INTERVAL '1 day',
     NOW() - INTERVAL '1 day'),

    (3, 'user_003', 1, 2,
     'Konser Dewa 19 Reuni', 'VIP', 750000.00,
     'expired',
     NOW() - INTERVAL '3 days 1 minute',
     NOW() - INTERVAL '3 days 15 minutes',
     NOW() - INTERVAL '3 days'),

    (4, 'user_004', 3, 8,
     'Slipknot Download Festival', 'Festival', 500000.00,
     'cancelled',
     NOW() + INTERVAL '5 minutes',
     NOW() - INTERVAL '5 hours',
     NOW() - INTERVAL '4 hours 30 minutes'),

    (5, 'user_005', 2, 5,
     'Blackpink World Tour Jakarta', 'VIP', 900000.00,
     'expired',
     NOW() - INTERVAL '1 day 1 minute',
     NOW() - INTERVAL '1 day 15 minutes',
     NOW() - INTERVAL '1 day'),

    (6, 'user_006', 1, 1,
     'Konser Dewa 19 Reuni', 'VVIP', 2500000.00,
     'confirmed',
     NOW() - INTERVAL '3 hours 45 minutes',
     NOW() - INTERVAL '4 hours',
     NOW() - INTERVAL '3 hours 50 minutes'),

    (7, 'user_007', 1, 2,
     'Konser Dewa 19 Reuni', 'VIP', 750000.00,
     'confirmed',
     NOW() - INTERVAL '4 hours 45 minutes',
     NOW() - INTERVAL '6 hours',
     NOW() - INTERVAL '5 hours'),

    (8, 'user_008', 3, 7,
     'Slipknot Download Festival', 'VIP', 1200000.00,
     'confirmed',
     NOW() - INTERVAL '11 hours 11 minutes',
     NOW() - INTERVAL '12 hours',
     NOW() - INTERVAL '11 hours 30 minutes'),

    (9, 'user_009', 2, 4,
     'Blackpink World Tour Jakarta', 'VVIP', 3000000.00,
     'confirmed',
     NOW() - INTERVAL '2 hours 8 minutes',
     NOW() - INTERVAL '3 hours',
     NOW() - INTERVAL '2 hours 30 minutes'),

    (10, 'user_010', 1, 3,
     'Konser Dewa 19 Reuni', 'Festival', 350000.00,
     'locked',
     NOW() + INTERVAL '12 minutes',
     NOW() - INTERVAL '3 minutes',
     NOW() - INTERVAL '3 minutes')

ON CONFLICT DO NOTHING;

SELECT setval('orders_id_seq', (SELECT MAX(id) FROM orders));

-- 6 tiket — hanya untuk order yang confirmed
-- seat_number = 'SEAT-{order_id}' (deterministik, unik)
INSERT INTO tickets
    (id, order_id, user_id,
     event_name, seat_category, seat_number, qr_code,
     status, issued_at, updated_at)
VALUES
    (1, 1, 'user_001',
     'Konser Dewa 19 Reuni', 'Festival',
     'SEAT-1', 'QR-11111111-0001-4000-a000-000000000001',
     'active',
     NOW() - INTERVAL '2 days',
     NOW() - INTERVAL '2 days'),

    (2, 2, 'user_002',
     'Blackpink World Tour Jakarta', 'Festival',
     'SEAT-2', 'QR-22222222-0002-4000-a000-000000000002',
     'active',
     NOW() - INTERVAL '1 day',
     NOW() - INTERVAL '1 day'),

    (3, 6, 'user_006',
     'Konser Dewa 19 Reuni', 'VVIP',
     'SEAT-6', 'QR-66666666-0006-4000-a000-000000000006',
     'active',
     NOW() - INTERVAL '3 hours 50 minutes',
     NOW() - INTERVAL '3 hours 50 minutes'),

    (4, 7, 'user_007',
     'Konser Dewa 19 Reuni', 'VIP',
     'SEAT-7', 'QR-77777777-0007-4000-a000-000000000007',
     'active',
     NOW() - INTERVAL '5 hours',
     NOW() - INTERVAL '5 hours'),

    (5, 8, 'user_008',
     'Slipknot Download Festival', 'VIP',
     'SEAT-8', 'QR-88888888-0008-4000-a000-000000000008',
     'active',
     NOW() - INTERVAL '11 hours 30 minutes',
     NOW() - INTERVAL '11 hours 30 minutes'),

    (6, 9, 'user_009',
     'Blackpink World Tour Jakarta', 'VVIP',
     'SEAT-9', 'QR-99999999-0009-4000-a000-000000000009',
     'active',
     NOW() - INTERVAL '2 hours 30 minutes',
     NOW() - INTERVAL '2 hours 30 minutes')

ON CONFLICT DO NOTHING;

SELECT setval('tickets_id_seq', (SELECT MAX(id) FROM tickets));
