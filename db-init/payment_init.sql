-- ================================================================
-- payment-service database schema
-- Kelompok 5 — War Tiket Konser
-- Tanggung jawab: Jusriadi Liwang (Data & Persistence Engineer)
-- ================================================================

CREATE TABLE IF NOT EXISTS payments (
    id         SERIAL PRIMARY KEY,
    order_id   INTEGER NOT NULL,
    user_id    VARCHAR(255) NOT NULL,
    amount     NUMERIC(12,2) NOT NULL,
    method     VARCHAR(50) NOT NULL
               CHECK (method IN ('bank_transfer','credit_card','gopay','ovo','dana')),
    status     VARCHAR(50) NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','success','failed','cancelled','refunded')),
    paid_at    TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order  ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user   ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
-- Partial index untuk cek duplikat pembayaran aktif (hot query path)
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_order_active
    ON payments(order_id)
    WHERE status IN ('pending', 'success');

-- ── Seed data untuk demo ──────────────────────────────────────
-- 7 payments: mencakup semua status (success, failed, refunded)
-- Tidak ada payment untuk:
--   order#3  (user_003) — expired sebelum bayar
--   order#4  (user_004) — cancelled sebelum bayar
--   order#10 (user_010) — masih locked, belum bayar
--
-- Catatan: order#7 (user_007) statusnya 'refunded' → tidak
--   melanggar partial UNIQUE idx_payments_order_active karena
--   'refunded' tidak termasuk filter (pending, success).

INSERT INTO payments
    (id, order_id, user_id, amount, method, status, paid_at, created_at, updated_at)
VALUES
    -- user_001: Festival Dewa19 — bayar gopay, berhasil
    (1, 1, 'user_001', 350000.00, 'gopay',
     'success',
     NOW() - INTERVAL '1 day 23 hours',
     NOW() - INTERVAL '2 days',
     NOW() - INTERVAL '1 day 23 hours'),

    -- user_002: Festival Blackpink — bayar credit_card, berhasil
    (2, 2, 'user_002', 450000.00, 'credit_card',
     'success',
     NOW() - INTERVAL '23 hours 55 minutes',
     NOW() - INTERVAL '1 day',
     NOW() - INTERVAL '23 hours 55 minutes'),

    -- user_005: VIP Blackpink — bayar bank_transfer, GAGAL
    (3, 5, 'user_005', 900000.00, 'bank_transfer',
     'failed',
     NULL,
     NOW() - INTERVAL '1 day 14 minutes',
     NOW() - INTERVAL '1 day 13 minutes'),

    -- user_006: VVIP Dewa19 — bayar dana, berhasil
    (4, 6, 'user_006', 2500000.00, 'dana',
     'success',
     NOW() - INTERVAL '3 hours 48 minutes',
     NOW() - INTERVAL '4 hours',
     NOW() - INTERVAL '3 hours 48 minutes'),

    -- user_007: VIP Dewa19 — bayar credit_card, berhasil → lalu DIREFUND
    -- status 'refunded' aman: tidak melanggar partial UNIQUE index
    (5, 7, 'user_007', 750000.00, 'credit_card',
     'refunded',
     NOW() - INTERVAL '4 hours 55 minutes',
     NOW() - INTERVAL '6 hours',
     NOW() - INTERVAL '2 hours'),

    -- user_008: VIP Slipknot — bayar bank_transfer, berhasil
    (6, 8, 'user_008', 1200000.00, 'bank_transfer',
     'success',
     NOW() - INTERVAL '11 hours 29 minutes',
     NOW() - INTERVAL '12 hours',
     NOW() - INTERVAL '11 hours 29 minutes'),

    -- user_009: VVIP Blackpink — bayar ovo, berhasil
    (7, 9, 'user_009', 3000000.00, 'ovo',
     'success',
     NOW() - INTERVAL '2 hours 28 minutes',
     NOW() - INTERVAL '3 hours',
     NOW() - INTERVAL '2 hours 28 minutes')

ON CONFLICT DO NOTHING;

SELECT setval('payments_id_seq', (SELECT MAX(id) FROM payments));
