/**
 * payment-service — gateway/payment-gateway.adapter.js
 * Adapter untuk payment gateway (simulasi — ganti dengan Midtrans/Xendit di produksi)
 */

async function charge(method, amount) {
  // Simulasi delay jaringan payment gateway (100–500ms)
  await new Promise(r => setTimeout(r, Math.random() * 400 + 100));
  // 90% sukses untuk simulasi
  return Math.random() < 0.9;
}

module.exports = { charge };
