-- ============================================================
-- DATASET: event_db (event-service)
-- Kelompok 5 · Praktikum Microservices · WarTiket
-- Data & Persistence Engineer: Jusriadi Liwang
-- ============================================================

INSERT INTO events (id, name, venue, event_date, status, description, banner_url, created_at) VALUES
(1, 'Dewa 19 Reunion Tour 2026',      'Gelora Bung Karno, Jakarta',      '2026-10-15 19:00:00', 'on_sale', 'Reuni legendaris Dewa 19 setelah 10 tahun.',              NULL, NOW()),
(2, 'Coldplay Music of the Spheres',  'Stadion Utama GBK, Jakarta',      '2026-11-03 20:00:00', 'on_sale', 'Coldplay hadir lagi ke Indonesia dengan show spektakuler.',NULL, NOW()),
(3, 'EDC Jakarta 2026',               'Indonesia Arena, Jakarta',         '2026-09-20 22:00:00', 'on_sale', 'Festival EDM terbesar di Asia Tenggara.',                  NULL, NOW()),
(4, 'Raisa Live in Concert',          'The Kasablanka Hall, Jakarta',     '2026-09-28 19:30:00', 'on_sale', 'Raisa hadir dengan set akustik intim.',                    NULL, NOW()),
(5, 'Sound Drenaline 2026',           'Pantai Carnaval, Ancol Jakarta',   '2026-10-01 17:00:00', 'on_sale', 'Festival rock terbesar Indonesia.',                        NULL, NOW()),
(6, 'BTS Yet to Come in Jakarta',     'Indonesia International Expo',     '2026-12-10 18:00:00', 'on_sale', 'ARMY siap? BTS hadir kembali ke Jakarta!',                 NULL, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO seat_categories (id, event_id, name, price, total_seats, available_seats) VALUES
-- Dewa 19
(1,  1, 'VVIP',      2500000,  200,   50),
(2,  1, 'VIP',       1500000,  500,  150),
(3,  1, 'Festival',   750000, 3000,  800),
-- Coldplay
(4,  2, 'Cat 1',     4000000,  300,    0),
(5,  2, 'Cat 2',     2500000,  600,   30),
(6,  2, 'Cat 3',     1200000, 2000,  400),
-- EDC Jakarta
(7,  3, 'VIP Loft',  3000000,  200,   80),
(8,  3, 'General',    900000, 5000, 2500),
-- Raisa
(9,  4, 'Premium',   1500000,  400,  120),
(10, 4, 'Regular',    650000, 1200,  600),
-- Sound Drenaline
(11, 5, 'Diamond',   2000000,  300,  100),
(12, 5, 'Gold',      1000000, 1000,  450),
(13, 5, 'Festival',   400000, 8000, 3000),
-- BTS
(14, 6, 'R1',        5000000,  100,    5),
(15, 6, 'R2',        3000000,  300,   50),
(16, 6, 'R3',        1500000, 1000,  200),
(17, 6, 'Fan Zone',   800000, 3000,  800)
ON CONFLICT (id) DO NOTHING;
