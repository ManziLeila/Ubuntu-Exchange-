const crypto = require('crypto');
const prisma = require('../utils/prisma');
const logger = require('../utils/logger');

async function createWebhookEvent(transferId, event, payload) {
  try {
    return await prisma.transactionWebhook.create({
      data: { transferId, event, payload, status: 'PENDING' },
    });
  } catch (err) {
    logger.error({ msg: 'Failed to create webhook event', transferId, event, error: err.message });
    return null;
  }
}

async function dispatchWebhook(webhookId) {
  const webhook = await prisma.transactionWebhook.findUnique({ where: { id: webhookId } });
  if (!webhook || !webhook.endpoint) {
    await prisma.transactionWebhook.update({ where: { id: webhookId }, data: { status: 'SKIPPED' } });
    return;
  }

  const axios = require('axios');
  const secret = process.env.WEBHOOK_SECRET || 'webhook-secret';
  const body = JSON.stringify(webhook.payload);
  const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');

  try {
    const resp = await axios.post(webhook.endpoint, webhook.payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-GlobalTransact-Signature': `sha256=${sig}`,
        'X-GlobalTransact-Event': webhook.event,
      },
      timeout: 10000,
    });
    await prisma.transactionWebhook.update({
      where: { id: webhookId },
      data: {
        status: 'DELIVERED',
        attempts: { increment: 1 },
        lastAttemptAt: new Date(),
        statusCode: resp.status,
      },
    });
  } catch (err) {
    const attempts = webhook.attempts + 1;
    await prisma.transactionWebhook.update({
      where: { id: webhookId },
      data: {
        status: attempts >= 5 ? 'FAILED' : 'PENDING',
        attempts: { increment: 1 },
        lastAttemptAt: new Date(),
        statusCode: err.response?.status || null,
        responseBody: err.message?.slice(0, 500),
      },
    });
    logger.warn({ msg: 'Webhook dispatch failed', webhookId, attempt: attempts, error: err.message });
  }
}

async function dispatchPendingWebhooks() {
  const pending = await prisma.transactionWebhook.findMany({
    where: { status: 'PENDING', endpoint: { not: null }, attempts: { lt: 5 } },
    take: 50,
    orderBy: { createdAt: 'asc' },
  });
  await Promise.allSettled(pending.map(w => dispatchWebhook(w.id)));
}

module.exports = { createWebhookEvent, dispatchWebhook, dispatchPendingWebhooks };
