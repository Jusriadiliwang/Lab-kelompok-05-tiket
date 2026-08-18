-- ================================================================
-- event-service database schema
-- Kelompok 5 — War Tiket Konser
-- Tanggung jawab: Jusriadi Liwang (Data & Persistence Engineer)
-- ================================================================

CREATE TABLE IF NOT EXISTS events (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    venue       VARCHAR(255) NOT NULL,
    event_date  TIMESTAMP NOT NULL,
    description TEXT,
    banner_url  VARCHAR(500),
    status      VARCHAR(50) NOT NULL DEFAULT 'upcoming'
                CHECK (status IN ('upcoming','on_sale','sold_out','completed','cancelled')),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seat_categories (
    id              SERIAL PRIMARY KEY,
    event_id        INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    total_seats     INTEGER NOT NULL CHECK (total_seats > 0),
    available_seats INTEGER NOT NULL CHECK (available_seats >= 0),
    price           NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT available_lte_total CHECK (available_seats <= total_seats)
);

-- Index untuk query catalog yang sering diakses
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_seat_categories_event ON seat_categories(event_id);
CREATE INDEX IF NOT EXISTS idx_seat_categories_available ON seat_categories(event_id, available_seats);

-- ── Seed data untuk demo ──────────────────────────────────────
-- 3 event dengan berbagai status
-- available_seats sudah dikurangi sesuai orders di ticket_db (seed_data)

INSERT INTO events (name, venue, event_date, description, banner_url, status) VALUES
    ('Konser Dewa 19 Reuni',
     'Gelora Bung Karno, Jakarta',
     '2026-09-20 19:00:00',
     'Reuni legenda rock Indonesia — Ahmad Dhani dan kawan-kawan kembali ke panggung setelah 10 tahun.',
     'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
     'on_sale'),
    ('Blackpink World Tour Jakarta',
     'JIEXPO Kemayoran, Jakarta',
     '2026-10-05 20:00:00',
     'K-pop spektakuler — Blackpink Born Pink World Tour hadir di Jakarta untuk pertama kalinya.',
     'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800',
     'on_sale'),
    ('Slipknot Download Festival',
     'Allianz Ecopark Ancol, Jakarta',
     '2026-11-15 17:00:00',
     'Festival metal terbesar di Asia Tenggara — Slipknot, Lamb of God, dan 20+ band internasional.',
     'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=800',
     'upcoming'),
    ('Ed Sheeran Mathematics Tour',
     'Stadion Utama GBK, Jakarta',
     '2026-08-10 19:30:00',
     'Tur akhir karir Ed Sheeran — satu malam yang tak terlupakan.',
     'https://cdn.example.com/banners/edsheeran-math.jpg',
     'completed'),
    ('Java Jazz Festival 2026',
     'Jakarta Convention Center',
     '2026-07-04 14:00:00',
     'Festival jazz bergengsi — 3 hari, 5 panggung, 100+ penampil.',
     'https://cdn.example.com/banners/java-jazz-2026.jpg',
     'cancelled')
ON CONFLICT DO NOTHING;

-- Seat categories — available_seats sudah mencerminkan state setelah seed orders:
--   Cat 1  VVIP  Dewa19   : 200 - 1 (order#6 confirmed)              = 199
--   Cat 2  VIP   Dewa19   : 500 - 1 (order#7 confirmed)              = 499
--   Cat 3  Fest  Dewa19   : 5000 - 1 (order#1) - 1 (order#10 locked) = 4998
--   Cat 4  VVIP  Blackpink: 150 - 1 (order#9 confirmed)              = 149
--   Cat 5  VIP   Blackpink: 800 - 0 (order#5 expired → seat kembali) = 800
--   Cat 6  Fest  Blackpink: 8000 - 1 (order#2 confirmed)             = 7999
--   Cat 7  VIP   Slipknot : 300 - 1 (order#8 confirmed)              = 299
--   Cat 8  Fest  Slipknot : 3000 - 0 (order#4 cancelled → kembali)  = 3000
INSERT INTO seat_categories (event_id, name, total_seats, available_seats, price) VALUES
    (1, 'VVIP',      200,   199, 2500000.00),
    (1, 'VIP',       500,   499,  750000.00),
    (1, 'Festival', 5000,  4998,  350000.00),
    (2, 'VVIP',      150,   149, 3000000.00),
    (2, 'VIP',       800,   800,  900000.00),
    (2, 'Festival', 8000,  7999,  450000.00),
    (3, 'VIP',       300,   299, 1200000.00),
    (3, 'Festival', 3000,  3000,  500000.00),
    (4, 'Festival', 8000,  7998,  850000.00),
    (4, 'VVIP',      500,   500, 5000000.00),
    (5, 'VIP',      1000,  1000, 1500000.00),
    (5, 'Festival', 5000,  5000,  600000.00)
ON CONFLICT DO NOTHING;
