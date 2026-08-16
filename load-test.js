/**
 * Load test sederhana — War Tiket Konser
 * Mengukur p50, p95, p99 latency + throughput + error rate
 * Sebelum: langsung ke service (tanpa gateway)
 * Sesudah: via api-gateway (dengan rate-limit + Redis lock)
 */
const http = require('http');

function request(url, headers = {}) {
  return new Promise((resolve) => {
    const start = Date.now();
    const opts = { ...require('url').parse(url), headers };
    const req = http.get(opts, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({
        ok: res.statusCode < 400,
        status: res.statusCode,
        rateLimited: res.statusCode === 429,
        latency: Date.now() - start
      }));
    });
    req.on('error', () => resolve({ ok: false, status: 0, rateLimited: false, latency: Date.now() - start }));
    req.setTimeout(5000, () => { req.destroy(); resolve({ ok: false, status: 0, rateLimited: false, latency: 5000 }); });
  });
}

function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * p / 100)];
}

async function runBatch(url, concurrency, total, headers = {}) {
  const results = [];
  const startAll = Date.now();
  let done = 0;

  while (done < total) {
    const batch = [];
    for (let i = 0; i < Math.min(concurrency, total - done); i++) {
      batch.push(request(url, headers));
    }
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
    done += batch.length;
  }

  const elapsed = (Date.now() - startAll) / 1000;
  const latencies = results.map(r => r.latency);
  const errors = results.filter(r => !r.ok && !r.rateLimited).length;
  const rateLimited = results.filter(r => r.rateLimited).length;

  return {
    total,
    success:     results.filter(r => r.ok).length,
    rateLimited,
    errors,
    errorRate:   ((errors / total) * 100).toFixed(1) + '%',
    throughput:  (total / elapsed).toFixed(1) + ' req/s',
    p50: percentile(latencies, 50) + 'ms',
    p95: percentile(latencies, 95) + 'ms',
    p99: percentile(latencies, 99) + 'ms',
  };
}

async function main() {
  const TOTAL = 200;
  const CONCURRENCY = 50;

  console.log('='.repeat(60));
  console.log('WAR TIKET — Load Test Report');
  console.log(`Concurrent: ${CONCURRENCY} | Total: ${TOTAL} requests`);
  console.log('='.repeat(60) + '\n');

  // ── SEBELUM: langsung ke event-service (tanpa gateway, tanpa rate-limit)
  console.log('[ SEBELUM ] GET /catalog → event-service :3001 (no gateway, no rate-limit)');
  const before = await runBatch('http://localhost:3001/catalog', CONCURRENCY, TOTAL);
  console.log(JSON.stringify(before, null, 2));

  // Jeda agar rate-limit window reset
  await new Promise(r => setTimeout(r, 3000));

  // ── SESUDAH: via api-gateway (dengan rate-limit, Redis, Correlation ID)
  console.log('\n[ SESUDAH ] GET /catalog → api-gateway :3000 (rate-limit + Redis + auth)');
  const after = await runBatch('http://localhost:3000/catalog', CONCURRENCY, TOTAL);
  console.log(JSON.stringify(after, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY (angka sebelum & sesudah)');
  console.log('='.repeat(60));
  console.log(`p95 latency   : ${before.p95} → ${after.p95}`);
  console.log(`p99 latency   : ${before.p99} → ${after.p99}`);
  console.log(`throughput    : ${before.throughput} → ${after.throughput}`);
  console.log(`real error    : ${before.errorRate} → ${after.errorRate}`);
  console.log(`rate-limited  : ${before.rateLimited} req → ${after.rateLimited} req (bot protection aktif)`);
  console.log(`success       : ${before.success} req → ${after.success} req`);
  console.log('='.repeat(60));
  console.log('NOTE: rate-limited = request berhasil DITOLAK gateway (bukan failure)');
  console.log('Ini bukti rate-limit bekerja: bot/spam diblokir, user legitimate dilayani.');
}

main().catch(console.error);
