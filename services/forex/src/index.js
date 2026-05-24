require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const axios = require('axios');
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3002;
const redis = new Redis(process.env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
  retryStrategy: (times) => Math.min(times * 1000, 30000),
});
let _forexRedisErrLogged = false;
redis.on('error', () => {
  if (!_forexRedisErrLogged) { console.error('[forex] Redis unavailable, rate caching disabled'); _forexRedisErrLogged = true; }
});

const CORRIDORS = [
  { corridor: 'RWF_KES', from: 'RWF', to: 'KES' },
  { corridor: 'RWF_UGX', from: 'RWF', to: 'UGX' },
  { corridor: 'RWF_AED', from: 'RWF', to: 'AED' },
  { corridor: 'RWF_TZS', from: 'RWF', to: 'TZS' },
  { corridor: 'RWF_RWF', from: 'RWF', to: 'RWF' },
];

const DEFAULT_SPREADS = {
  RWF_KES: parseFloat(process.env.DEFAULT_SPREAD_RWF_KES || '0.022'),
  RWF_UGX: parseFloat(process.env.DEFAULT_SPREAD_RWF_UGX || '0.020'),
  RWF_AED: parseFloat(process.env.DEFAULT_SPREAD_RWF_AED || '0.030'),
  RWF_TZS: parseFloat(process.env.DEFAULT_SPREAD_RWF_TZS || '0.022'),
  RWF_RWF: parseFloat(process.env.DEFAULT_SPREAD_RWF_RWF || '0.000'),
};

/**
 * Fetch rates from Open Exchange Rates and push to Core Service DB
 */
async function fetchAndStoreRates() {
  try {
    const resp = await axios.get('https://openexchangerates.org/api/latest.json', {
      params: { app_id: process.env.OPEN_EXCHANGE_RATES_APP_ID, base: 'USD' }
    });

    const usdRates = resp.data.rates;
    const fetchedAt = new Date();

    for (const { corridor, from, to } of CORRIDORS) {
      const midRate = from === to ? 1 : (1 / usdRates[from]) * usdRates[to];

      const spreadPct = await getSpread(corridor);
      const clientRate = midRate * (1 - spreadPct);

      const ratePayload = { corridor, from, to, midRate, spreadPct, clientRate, fetchedAt };
      await pushRateToCore(ratePayload);

      // Cache in Redis for fast lookup
      await redisSetex(`rate:${corridor}`, 300, JSON.stringify({ ...ratePayload, isStale: false }));
    }

    console.log(`[forex] Rates updated at ${fetchedAt.toISOString()}`);
  } catch (err) {
    console.error('[forex] Rate fetch failed:', err.message);
    // Mark all cached rates as stale
    for (const { corridor } of CORRIDORS) {
      const cached = await redisGet(`rate:${corridor}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        const ageMs = Date.now() - new Date(parsed.fetchedAt).getTime();
        if (ageMs > 15 * 60 * 1000) {
          parsed.isStale = true;
          await redisSet(`rate:${corridor}`, JSON.stringify(parsed));
        }
      }
    }
  }
}

async function pushRateToCore(ratePayload) {
  const token = jwt.sign({ sub: 'service:forex' }, process.env.SERVICE_JWT_SECRET, { expiresIn: '5m' });
  await axios.post(
    `${process.env.CORE_SERVICE_URL}/internal/v1/forex/rate`,
    ratePayload,
    { headers: { 'X-Service-Token': token } }
  );
}

async function redisGet(key) {
  try { return await redis.get(key); } catch { return null; }
}
async function redisSet(key, value) {
  try { await redis.set(key, value); } catch { /* Redis unavailable */ }
}
async function redisSetex(key, ttl, value) {
  try { await redis.setex(key, ttl, value); } catch { /* Redis unavailable */ }
}

async function getSpread(corridor) {
  const cached = await redisGet(`spread:${corridor}`);
  if (cached) return parseFloat(cached);
  return DEFAULT_SPREADS[corridor] || 0.025;
}

// ── Express routes ────────────────────────────────────────────────────────────
app.use(express.json());

app.get('/healthz', (req, res) => res.json({ status: 'ok', service: 'forex' }));
app.get('/readyz', async (req, res) => {
  try {
    await redis.ping();
    res.json({ status: 'ready', redis: 'up' });
  } catch {
    res.json({ status: 'ready', redis: 'unavailable' });
  }
});

/**
 * GET /api/forex/v1/rate?from=RWF&to=GHS — Fast Redis-cached lookup
 */
app.get('/api/forex/v1/rate', async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from and to required' });

  const corridor = `${from}_${to}`;
  const cached = await redisGet(`rate:${corridor}`);
  if (!cached) return res.status(404).json({ error: `No rate for ${corridor}` });

  const rate = JSON.parse(cached);
  const ageMs = Date.now() - new Date(rate.fetchedAt).getTime();
  rate.isStale = ageMs > 15 * 60 * 1000;
  rate.ageMinutes = Math.round(ageMs / 60000);

  res.json(rate);
});

/**
 * Internal: POST /internal/v1/forex/spread — Update spread from admin action
 */
app.post('/internal/v1/forex/spread', async (req, res) => {
  const { corridor, spreadPct } = req.body;
  await redisSet(`spread:${corridor}`, spreadPct.toString());
  res.json({ ok: true });
});

// ── Cron job ──────────────────────────────────────────────────────────────────
const interval = `*/${process.env.FETCH_INTERVAL_MINUTES || 5} * * * *`;
cron.schedule(interval, fetchAndStoreRates);

// Initial fetch on startup
fetchAndStoreRates();

app.listen(PORT, () => console.log(`[forex] Service running on port ${PORT}`));
