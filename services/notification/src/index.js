require('dotenv').config();
const Bull = require('bull');
const sgMail = require('@sendgrid/mail');
const nodemailer = require('nodemailer');
const express = require('express');
const Ioredis = require('ioredis');
const templates = require('./templates');
const smsProviders = require('./smsProviders');

const app = express();
const PORT = process.env.PORT || 3004;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const IDEMPOTENCY_TTL = 86400; // 24 hours

sgMail.setApiKey(process.env.SENDGRID_API_KEY || 'SG.mock');

const smtpTransport = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

const redis = new Ioredis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 3 });
redis.connect().catch(() => console.warn('[notification] Redis connect warning — idempotency fallback to in-memory'));
const inMemoryProcessed = new Set(); // fallback

async function isProcessed(key) {
  try { return !!(await redis.get(`notif:idem:${key}`)); } catch { return inMemoryProcessed.has(key); }
}
async function markProcessed(key) {
  try { await redis.set(`notif:idem:${key}`, '1', 'EX', IDEMPOTENCY_TTL); } catch { inMemoryProcessed.add(key); }
}

const queue = new Bull('notifications', REDIS_URL, { defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 1000 } } });
const smsProvider = smsProviders.getProvider();

// ── Email processor ───────────────────────────────────────────────────────────
queue.process('send_email', 5, async (job) => {
  const { template, to, data, idempotency_key } = job.data;

  if (idempotency_key && await isProcessed(idempotency_key)) {
    console.log(`[notification] Duplicate skipped: ${idempotency_key}`);
    return;
  }

  const rendered = templates[template];
  if (!rendered) throw new Error(`Unknown email template: ${template}`);
  const { subject, html, text } = rendered(data);

  const msg = {
    to,
    from: { email: process.env.EMAIL_FROM || 'noreply@globaltransact.com', name: process.env.EMAIL_FROM_NAME || 'GlobalTransact' },
    subject, html, text,
  };

  try {
    await sgMail.send(msg);
    console.log(`[notification] Email sent via SendGrid: ${template} → ${to}`);
  } catch (sgErr) {
    console.warn(`[notification] SendGrid failed (${sgErr.message}), falling back to SMTP`);
    try {
      await smtpTransport.sendMail({ from: process.env.EMAIL_FROM, to, subject, html, text });
      console.log(`[notification] Email sent via SMTP fallback: ${template} → ${to}`);
    } catch (smtpErr) {
      console.error(`[notification] SMTP fallback also failed: ${smtpErr.message}`);
      throw smtpErr;
    }
  }

  if (idempotency_key) await markProcessed(idempotency_key);
});

// ── SMS processor ─────────────────────────────────────────────────────────────
queue.process('send_sms', 5, async (job) => {
  const { to, message, idempotency_key } = job.data;

  if (idempotency_key && await isProcessed(idempotency_key)) {
    console.log(`[notification] SMS duplicate skipped: ${idempotency_key}`);
    return;
  }

  const result = await smsProvider.send(to, message);
  console.log(`[notification] SMS sent: ${to} — ${result.status || result.messageId}`);

  if (idempotency_key) await markProcessed(idempotency_key);
  return result;
});

queue.on('failed', (job, err) => {
  console.error(`[notification] Job ${job.id} (${job.name}) failed after ${job.attemptsMade} attempts: ${err.message}`);
});

// ── Express health checks ─────────────────────────────────────────────────────
app.use(express.json());
app.get('/healthz', (req, res) => res.json({ status: 'ok', service: 'notification' }));
app.get('/readyz', (req, res) => res.json({ status: 'ready', queueName: queue.name }));

app.listen(PORT, () => console.log(`[notification] Service running on port ${PORT}`));
