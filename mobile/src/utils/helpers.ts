/**
 * Shared utilities — War Tiket Mobile
 * Centralized helpers untuk formatting, mapping, dll
 */

// ── Date & Time ───────────────────────────────────────────────
export function formatDate(iso?: string, style: 'short' | 'long' | 'time' = 'short'): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';

  switch (style) {
    case 'long':
      return d.toLocaleDateString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      }) + ' • ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    case 'time':
      return d.toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric',
      }) + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    case 'short':
    default:
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}

// ── Currency ──────────────────────────────────────────────────
export function formatPrice(n?: number | string): string {
  if (n === undefined || n === null || n === '') return '—';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(num)) return '—';
  return `Rp ${num.toLocaleString('id-ID')}`;
}

// ── Order Status ──────────────────────────────────────────────
export const ORDER_STATUS_LABEL: Record<string, string> = {
  CONFIRMED: 'Terkonfirmasi',
  LOCKED:    'Menunggu Bayar',
  PENDING:   'Menunggu Bayar',
  EXPIRED:   'Kedaluwarsa',
  CANCELLED: 'Dibatalkan',
};

export const ORDER_STATUS_COLOR: Record<string, string> = {
  CONFIRMED: '#030304',
  LOCKED:    '#77767b',
  PENDING:   '#77767b',
  EXPIRED:   '#ba1a1a',
  CANCELLED: '#ba1a1a',
};

export function isOrderCancellable(status: string): boolean {
  return status === 'LOCKED' || status === 'PENDING';
}

export function isOrderConfirmed(status: string): boolean {
  return status === 'CONFIRMED';
}

// ── Notification ──────────────────────────────────────────────
export const NOTIF_LABEL: Record<string, string> = {
  ETICKET:          'E-Tiket Terbit',
  REMINDER:         'Pengingat Event',
  FAILED_PAYMENT:   'Pembayaran Gagal',
  PAYMENT_REFUNDED: 'Refund Diproses',
  ORDER_EXPIRING:   'Segera Berakhir',
  ORDER_CANCELLED:  'Pesanan Dibatalkan',
};

export const NOTIF_ICON: Record<string, { icon: string; color: string }> = {
  ETICKET:          { icon: 'ticket',           color: '#030304' },
  REMINDER:         { icon: 'alarm-outline',    color: '#77767b' },
  FAILED_PAYMENT:   { icon: 'alert-circle',     color: '#ba1a1a' },
  PAYMENT_REFUNDED: { icon: 'refresh-circle',   color: '#77767b' },
  ORDER_EXPIRING:   { icon: 'time',             color: '#ffaa00' },
  ORDER_CANCELLED:  { icon: 'close-circle',     color: '#ba1a1a' },
};

// ── Error handling ────────────────────────────────────────────
export function getErrorMessage(err: any, fallback = 'Terjadi kesalahan. Silakan coba lagi.'): string {
  if (err?.isRateLimit) return err.friendlyMessage ?? 'Terlalu banyak request. Tunggu sebentar.';

  const status = err?.response?.status;
  const code   = err?.response?.data?.error;
  const msg    = err?.response?.data?.message;

  if (status === 409) {
    if (code === 'seat_locked')       return 'Kursi sudah dikunci user lain. Pilih kategori lain.';
    if (code === 'duplicate_payment') return 'Pembayaran untuk pesanan ini sudah ada.';
    if (code === 'user_exists')       return 'User ID sudah digunakan. Coba User ID lain.';
    if (code === 'duplicate_order')   return 'Kamu sudah memiliki pesanan aktif untuk konser ini.';
    return msg ?? 'Konflik data. Silakan coba lagi.';
  }
  if (status === 400) return msg ?? 'Data tidak valid. Periksa kembali inputan.';
  if (status === 401) return 'Sesi berakhir. Silakan login kembali.';
  if (status === 404) return 'Data tidak ditemukan.';
  if (status === 500) return 'Server error. Coba lagi beberapa saat.';
  if (status === 502) return 'Service tidak tersedia. Coba lagi nanti.';

  return msg ?? fallback;
}
