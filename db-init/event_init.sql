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

INSERT INTO events (name, venue, event_date, description, status) VALUES
    ('Konser Dewa 19 Reuni', 'Gelora Bung Karno, Jakarta', '2026-09-20 19:00:00', 'Reuni legenda rock Indonesia', 'on_sale'),
    ('Blackpink World Tour Jakarta', 'JIEXPO Kemayoran', '2026-10-05 20:00:00', 'K-pop spektakuler', 'on_sale'),
    ('Slipknot Download Festival', 'Allianz Ecopark Ancol', '2026-11-15 17:00:00', 'Metal terbesar Asia Tenggara', 'upcoming')
ON CONFLICT DO NOTHING;

INSERT INTO seat_categories (event_id, name, total_seats, available_seats, price) VALUES
    (1, 'VVIP',      200,  200, 2500000),
    (1, 'VIP',       500,  500,  750000),
    (1, 'Festival', 5000, 5000,  350000),
    (2, 'VVIP',      150,  150, 3000000),
    (2, 'VIP',       800,  800,  900000),
    (2, 'Festival', 8000, 8000,  450000),
    (3, 'VIP',       300,  300, 1200000),
    (3, 'Festival', 3000, 3000,  500000)
ON CONFLICT DO NOTHING;
