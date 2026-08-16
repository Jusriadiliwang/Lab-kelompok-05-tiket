/**
 * ticket-service — modules/seat-lock/seat-lock.service.js
 * Distributed lock via Redis SET NX EX
 * Kelompok 5: Miftahul Jannah (Arsitektur lock strategy)
 */
const { v4: uuidv4 } = require('uuid');

let redis;

function getRedis() {
  if (!redis) {
    const Redis = require('ioredis');
    redis = new Redis({
      host:        process.env.REDIS_HOST     || 'localhost',
      port:        parseInt(process.env.REDIS_PORT) || 6379,
      password:    process.env.REDIS_PASSWORD || 'tiketkonser123',
      lazyConnect: true,
    });
    redis.on('error', (e) => console.error('[ticket-service][Redis]', e.message));
  }
  return redis;
}

// Coba kunci kursi dengan Redis SET NX EX (atomic)
async function acquireLock(key, ttlMs = 10000) {
  const lockKey = `lock:seat:${key}`;
  const token   = uuidv4();
  const result  = await getRedis().set(lockKey, token, 'PX', ttlMs, 'NX');
  return result === 'OK' ? { lockKey, token } : null;
}

// Tandai kursi sebagai SOLD (tanpa TTL) sehingga tidak bisa di-lock ulang
async function markSold(seatKey) {
  const lockKey = `lock:seat:${seatKey}`;
  await getRedis().set(lockKey, 'SOLD');
}

// Lepas lock (hanya jika token cocok — Lua atomic check-and-delete)
async function releaseLock(lockKey, token) {
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  await getRedis().eval(script, 1, lockKey, token);
}

// Hapus lock kursi sepenuhnya (dipakai saat reservation expired)
async function deleteLock(seatKey) {
  const lockKey = `lock:seat:${seatKey}`;
  const current = await getRedis().get(lockKey);
  // Hanya hapus jika bukan SOLD
  if (current && current !== 'SOLD') {
    await getRedis().del(lockKey);
  }
}

// Set long-term reservation lock setelah DB INSERT berhasil
// Mencegah double-booking user yang sama via Redis (selain DB-level check)
async function setReservationLock(seatKey, userId, ttlSeconds) {
  const lockKey = `lock:seat:${seatKey}`;
  await getRedis().set(lockKey, userId, 'EX', ttlSeconds);
}

module.exports = { acquireLock, releaseLock, markSold, deleteLock, setReservationLock };
