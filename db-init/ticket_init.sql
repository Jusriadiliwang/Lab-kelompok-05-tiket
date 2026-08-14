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
    id           SERIAL PRIMARY KEY,
    order_id     INTEGER NOT NULL REFERENCES orders(id),
    user_id      VARCHAR(255) NOT NULL,
    event_name   VARCHAR(255),
    seat_category VARCHAR(100),
    seat_number  VARCHAR(50),
    qr_code      VARCHAR(500),
    status       VARCHAR(50) NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active','used','cancelled')),
    issued_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index untuk performa
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_expires ON orders(lock_expires_at) WHERE status = 'locked';
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_order ON tickets(order_id);
