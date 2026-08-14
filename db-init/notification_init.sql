-- ================================================================
-- notification-service database schema
-- Kelompok 5 — War Tiket Konser
-- Tanggung jawab: Jusriadi Liwang (Data & Persistence Engineer)
-- ================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id         SERIAL PRIMARY KEY,
    user_id    VARCHAR(255) NOT NULL,
    type       VARCHAR(100) NOT NULL
               CHECK (type IN ('ticket_confirmed','payment_failed','order_expiring','eticket')),
    title      VARCHAR(255) NOT NULL,
    message    TEXT NOT NULL,
    is_read    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications(user_id, is_read);
