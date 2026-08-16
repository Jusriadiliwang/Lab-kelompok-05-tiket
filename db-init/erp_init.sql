-- ================================================================
-- erp-service database schema (erp_db)
-- Kelompok 5 — War Tiket Konser
-- Catatan: ERP punya DB sendiri, TIDAK share dengan microservice DB
-- ================================================================

-- ── M5: User & Access Control (RBAC) ──────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(50)  NOT NULL DEFAULT 'analyst'
                  CHECK (role IN ('super-admin','event-manager','finance','analyst','support')),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role  ON admin_users(role);

-- ── M1/M2: Event & Seat Snapshot (Read model lokal ERP) ───────
CREATE TABLE IF NOT EXISTS erp_event_snapshots (
    id              SERIAL PRIMARY KEY,
    source_event_id INTEGER NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    venue           VARCHAR(255),
    event_date      TIMESTAMP,
    sale_open_at    TIMESTAMP,
    sale_close_at   TIMESTAMP,
    status          VARCHAR(50) NOT NULL DEFAULT 'upcoming'
                    CHECK (status IN ('upcoming','on_sale','sold_out','completed','cancelled','draft','published')),
    synced_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_erp_event_status ON erp_event_snapshots(status);
CREATE INDEX IF NOT EXISTS idx_erp_event_source ON erp_event_snapshots(source_event_id);

CREATE TABLE IF NOT EXISTS erp_seat_snapshots (
    id               SERIAL PRIMARY KEY,
    erp_event_id     INTEGER NOT NULL REFERENCES erp_event_snapshots(id) ON DELETE CASCADE,
    source_cat_id    INTEGER NOT NULL,
    category_name    VARCHAR(100),
    total_seats      INTEGER NOT NULL DEFAULT 0,
    available_seats  INTEGER NOT NULL DEFAULT 0,
    locked_seats     INTEGER NOT NULL DEFAULT 0,
    sold_seats       INTEGER NOT NULL DEFAULT 0,
    held_seats       INTEGER NOT NULL DEFAULT 0,   -- M2: kursi di-hold manual
    price            NUMERIC(12,2),
    status           VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE'
                     CHECK (status IN ('AVAILABLE','LOCKED','SOLD','HOLD')),
    synced_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_erp_seat_event  ON erp_seat_snapshots(erp_event_id);
CREATE INDEX IF NOT EXISTS idx_erp_seat_status ON erp_seat_snapshots(status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_seat_event_cat ON erp_seat_snapshots(erp_event_id, source_cat_id);

-- ── M3: Revenue Reports ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS revenue_reports (
    id               SERIAL PRIMARY KEY,
    source_event_id  INTEGER NOT NULL,
    report_date      DATE NOT NULL,
    tickets_sold     INTEGER NOT NULL DEFAULT 0,
    tickets_locked   INTEGER NOT NULL DEFAULT 0,
    tickets_expired  INTEGER NOT NULL DEFAULT 0,
    gross_revenue    NUMERIC(15,2) NOT NULL DEFAULT 0,
    refunded_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
    net_revenue      NUMERIC(15,2) GENERATED ALWAYS AS (gross_revenue - refunded_amount) STORED,
    generated_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (source_event_id, report_date)
);

CREATE INDEX IF NOT EXISTS idx_revenue_event ON revenue_reports(source_event_id);
CREATE INDEX IF NOT EXISTS idx_revenue_date  ON revenue_reports(report_date);

-- ── M6: Audit Trail (immutable — tidak ada UPDATE/DELETE) ──────
CREATE TABLE IF NOT EXISTS audit_logs (
    id          SERIAL PRIMARY KEY,
    admin_id    INTEGER REFERENCES admin_users(id),
    action      VARCHAR(50) NOT NULL
                CHECK (action IN ('CREATE','UPDATE','DELETE','REFUND','EXPORT','LOGIN','LOGOUT','HOLD_SEAT','PUBLISH','CANCEL')),
    entity_type VARCHAR(50) NOT NULL
                CHECK (entity_type IN ('EVENT','SEAT','ORDER','USER','PAYMENT','REVENUE')),
    entity_id   VARCHAR(100),
    before_state JSONB,
    after_state  JSONB,
    ip_address   VARCHAR(45),
    created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_admin  ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_time   ON audit_logs(created_at);

-- ── Seed: default super-admin ──────────────────────────────────
-- password: Admin@kelompok5 (hashed dengan bcrypt cost=10)
INSERT INTO admin_users (name, email, password_hash, role)
VALUES (
  'Super Admin',
  'admin@wartiket.id',
  '$2a$10$CPO4qw4XqDRZSfMzunkhzemptnDRSkl7ifmlLzwepNPR5GDI1wkD.',
  'super-admin'
) ON CONFLICT (email) DO NOTHING;
