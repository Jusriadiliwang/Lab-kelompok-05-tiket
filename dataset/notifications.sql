-- ============================================================
-- DATASET: notification_db (notification-service)
-- ============================================================

INSERT INTO notifications (id, user_id, order_id, type, title, message, is_read, created_at) VALUES
('NTF-001', 'USR-001', 'ORD-001', 'booking_confirm', 'Pemesanan Berhasil!',  'Tiket Dewa 19 VIP × 2 berhasil dipesan. Total: Rp 3.000.000',           true,  '2026-08-01 09:20:00'),
('NTF-002', 'USR-001', 'ORD-001', 'payment_success', 'Pembayaran Diterima', 'Pembayaran Rp 3.000.000 via GoPay berhasil. Cek tiket kamu.',            true,  '2026-08-01 09:21:00'),
('NTF-003', 'USR-002', 'ORD-002', 'booking_confirm', 'Pemesanan Berhasil!', 'Tiket Coldplay Cat 3 × 3 berhasil dipesan. Total: Rp 3.600.000',         true,  '2026-08-02 14:35:00'),
('NTF-004', 'USR-002', 'ORD-002', 'payment_success', 'Pembayaran Diterima', 'Pembayaran Rp 3.600.000 via OVO berhasil.',                              true,  '2026-08-02 14:36:00'),
('NTF-005', 'USR-003', 'ORD-003', 'booking_confirm', 'Pemesanan Berhasil!', 'Tiket EDC Jakarta General × 4 berhasil dipesan.',                        true,  '2026-08-03 11:05:00'),
('NTF-006', 'USR-004', 'ORD-004', 'booking_confirm', 'Pemesanan Berhasil!', 'Tiket Raisa Premium × 1 berhasil dipesan.',                              true,  '2026-08-04 16:50:00'),
('NTF-007', 'USR-005', 'ORD-005', 'booking_confirm', 'Pemesanan Berhasil!', 'Tiket Sound Drenaline Festival × 5 berhasil dipesan.',                   true,  '2026-08-05 10:25:00'),
('NTF-008', 'USR-007', 'ORD-008', 'booking_confirm', 'Pesanan Menunggu',    'Tiket Coldplay Cat 2 × 2 menunggu pembayaran. Selesaikan dalam 15 mnt.', false, '2026-08-20 12:01:00'),
('NTF-009', 'USR-008', 'ORD-009', 'payment_failed',  'Pembayaran Gagal',    'Pembayaran untuk EDC Jakarta VIP Loft gagal diproses.',                  false, '2026-08-08 17:05:00'),
('NTF-010', 'USR-009', 'ORD-010', 'payment_success', 'Pembayaran Diterima', 'Pembayaran Rp 3.000.000 via Bank Transfer berhasil.',                    true,  '2026-08-09 13:16:00')
ON CONFLICT (id) DO NOTHING;
