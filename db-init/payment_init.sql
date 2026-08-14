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

CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
