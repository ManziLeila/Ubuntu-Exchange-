require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const Bull = require('bull');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const winston = require('winston');

const app = express();
const PORT = process.env.PORT || 3003;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const CORE_URL = process.env.CORE_SERVICE_URL || 'http://localhost:3001';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

// ── Mock provider (in-memory) ─────────────────────────────────────────────────
const STATUS_MAP = new Map();
const FAILURE_RATE_COLLECT = parseFloat(process.env.MOCK_FAILURE_RATE_COLLECT || '0.05');
const FAILURE_RATE_DISBURSE = parseFloat(process.env.MOCK_FAILURE_RATE_DISBURSE || '0.03');

function generateServiceToken() {
  return jwt.sign({ sub: 'service:momo' }, process.env.SERVICE_JWT_SECRET, { expiresIn: '5m' });
}

async function sendCoreCallback(path, body) {
  const token = generateServiceToken();
  return axios.post(`${CORE_URL}${path}`, body, {
    headers: { 'x-service-token': token, 'Content-Type': 'application/json' },
    timeout: 8000,
  });
}

// ── Bull queues ───────────────────────────────────────────────────────────────
const collectQueue = new Bull('momo:collect', REDIS_URL, { defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } } });
const disburseQueue = new Bull('momo:disburse', REDIS_URL, { defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 3000 } } });

collectQueue.process(5, async (job) => {
  const { urc, amount, currency, msisdn, country } = job.data;
  const ref = `MOMO_COLL_${uuidv4().replace(/-/g, '').slice(0, 16).toUpperCase()}`;
  STATUS_MAP.set(ref, 'PENDING');
  logger.info({ msg: 'Processing collection', ref, urc, attempt: job.attemptsMade + 1 });

  await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));

  const failed = Math.random() < FAILURE_RATE_COLLECT;
  const status = failed ? 'FAILED' : 'SUCCESSFUL';
  STATUS_MAP.set(ref, status);

  try {
    await sendCoreCallback('/webhooks/payment/momo-collection', { urc, ref, status, provider: 'mtn_momo', country });
    logger.info({ msg: 'Collection callback sent', ref, urc, status });
  } catch (err) {
    logger.error({ msg: 'Collection callback failed', ref, urc, error: err.message });
    if (job.attemptsMade < 2) throw err; // re-queue
  }

  return { ref, status };
});

disburseQueue.process(5, async (job) => {
  const { urc, amount, currency, msisdn, country, recipientName } = job.data;
  const ref = `MOMO_PAY_${uuidv4().replace(/-/g, '').slice(0, 16).toUpperCase()}`;
  STATUS_MAP.set(ref, 'PENDING');
  logger.info({ msg: 'Processing disbursement', ref, urc, attempt: job.attemptsMade + 1 });

  await new Promise(r => setTimeout(r, 2000 + Math.random() * 1500));

  const failed = Math.random() < FAILURE_RATE_DISBURSE;
  const status = failed ? 'FAILED' : 'SUCCESSFUL';
  STATUS_MAP.set(ref, status);

  try {
    await sendCoreCallback('/webhooks/payment/momo-payout', { urc, ref, status, provider: 'mtn_momo', country });
    logger.info({ msg: 'Payout callback sent', ref, urc, status });
  } catch (err) {
    logger.error({ msg: 'Payout callback failed', ref, urc, error: err.message });
    if (job.attemptsMade < 2) throw err;
  }

  return { ref, status };
});

collectQueue.on('failed', (job, err) => logger.error({ msg: 'Collection job failed', jobId: job.id, error: err.message }));
disburseQueue.on('failed', (job, err) => logger.error({ msg: 'Disburse job failed', jobId: job.id, error: err.message }));

// ── Express app ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

function verifyServiceToken(req, res, next) {
  try {
    const token = req.headers['x-service-token'];
    if (!token) return res.status(401).json({ error: 'Missing service token' });
    jwt.verify(token, process.env.SERVICE_JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid service token' });
  }
}

app.get('/healthz', (req, res) => res.json({ status: 'ok', service: 'momo' }));

// Initiate collection
app.post('/internal/v1/momo/collect', verifyServiceToken, async (req, res) => {
  try {
    const { urc, amount, currency, msisdn, country } = req.body;
    if (!urc || !amount || !msisdn) return res.status(400).json({ error: 'urc, amount, msisdn required' });
    const job = await collectQueue.add({ urc, amount, currency, msisdn, country });
    const pendingRef = `MOMO_COLL_QUEUED_${job.id}`;
    logger.info({ msg: 'Collection job queued', urc, jobId: job.id });
    res.status(202).json({ ref: pendingRef, status: 'QUEUED', jobId: job.id });
  } catch (err) {
    logger.error({ msg: 'Failed to queue collection', error: err.message });
    res.status(500).json({ error: 'Failed to initiate collection' });
  }
});

// Initiate disbursement
app.post('/internal/v1/momo/disburse', verifyServiceToken, async (req, res) => {
  try {
    const { urc, amount, currency, msisdn, country, recipientName } = req.body;
    if (!urc || !amount || !msisdn) return res.status(400).json({ error: 'urc, amount, msisdn required' });
    const job = await disburseQueue.add({ urc, amount, currency, msisdn, country, recipientName });
    const pendingRef = `MOMO_PAY_QUEUED_${job.id}`;
    logger.info({ msg: 'Disburse job queued', urc, jobId: job.id });
    res.status(202).json({ ref: pendingRef, status: 'QUEUED', jobId: job.id });
  } catch (err) {
    logger.error({ msg: 'Failed to queue disbursement', error: err.message });
    res.status(500).json({ error: 'Failed to initiate disbursement' });
  }
});

// Check payment status
app.get('/internal/v1/momo/status/:ref', verifyServiceToken, (req, res) => {
  const status = STATUS_MAP.get(req.params.ref) || 'UNKNOWN';
  res.json({ ref: req.params.ref, status });
});

app.listen(PORT, () => logger.info({ msg: 'MoMo service started', port: PORT }));

process.on('SIGTERM', async () => {
  await collectQueue.close();
  await disburseQueue.close();
  process.exit(0);
});
