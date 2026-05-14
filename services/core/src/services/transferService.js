const axios = require('axios');
const prisma = require('../utils/prisma');
const logger = require('../utils/logger');
const { generateURC } = require('../utils/helpers');
const Bull = require('bull');
const { Decimal } = require('@prisma/client/runtime/library');

const notifQueue = new Bull('notifications', process.env.REDIS_URL);

function emitSocketEvent(event, room, data) {
  try {
    const io = global.io;
    if (io) io.to(room).emit(event, data);
  } catch (_) { /* non-critical */ }
}

const STALE_MINUTES = parseInt(process.env.STALE_RATE_MINUTES || '15');

/**
 * Step 1: Initiate a new transfer.
 * - Fetch & lock FX rate
 * - Calculate amounts
 * - Reserve GHS from Ghana pool
 * - Debit sender (wallet or MoMo)
 * - Create transfer in PENDING_APPROVAL state
 */
async function initiateTransfer(senderId, data, requestId) {
  const {
    recipientName, recipientMsisdn, recipientCountry,
    sendCurrency, recvCurrency, sendAmount,
    fundingMethod, payoutMethod, agentId
  } = data;

  const corridor = `${sendCurrency}_${recvCurrency}`;

  // 1. Get current FX rate (must not be stale)
  const fxRate = await getLockedRate(corridor);

  // 2. Calculate amounts
  const sendAmt = new Decimal(sendAmount);
  const fee = sendAmt.mul(new Decimal('0.01')); // 1% platform fee
  const totalCharged = sendAmt.plus(fee);
  const recvAmt = sendAmt.mul(new Decimal(fxRate.clientRate.toString()));

  // 3. Check sender exists and get wallet
  const sender = await prisma.user.findUnique({
    where: { id: senderId },
    include: { clientWallet: true }
  });
  if (!sender) throw Object.assign(new Error('Sender not found'), { status: 404 });

  // 4. Check platform liquidity in destination currency
  const destPool = await prisma.platformAccount.findUnique({
    where: { currency: recvCurrency }
  });
  if (!destPool) throw Object.assign(new Error(`No liquidity pool for ${recvCurrency}`), { status: 503 });
  if (new Decimal(destPool.balance.toString()).lessThan(recvAmt)) {
    throw Object.assign(new Error('Insufficient platform liquidity for this corridor'), { status: 503 });
  }

  // 5. Execute transfer atomically
  const transfer = await prisma.$transaction(async (tx) => {
    const urc = generateURC();

    // Debit sender wallet (for wallet funding method)
    if (fundingMethod === 'wallet') {
      const wallet = sender.clientWallet;
      if (!wallet || new Decimal(wallet.balance.toString()).lessThan(totalCharged)) {
        throw Object.assign(new Error('Insufficient wallet balance'), { status: 400 });
      }
      const newBalance = new Decimal(wallet.balance.toString()).minus(totalCharged);
      await tx.clientWallet.update({ where: { id: wallet.id }, data: { balance: newBalance } });
      await tx.clientLedger.create({
        data: {
          walletId: wallet.id,
          type: 'transfer_debit',
          amount: totalCharged,
          direction: 'debit',
          balanceBefore: wallet.balance,
          balanceAfter: newBalance,
          reference: urc,
          description: `Transfer ${urc} — ${sendCurrency}→${recvCurrency}`
        }
      });
    }

    // Reserve destination amount from platform pool
    const poolBefore = new Decimal(destPool.balance.toString());
    const poolAfter = poolBefore.minus(recvAmt);
    await tx.platformAccount.update({
      where: { id: destPool.id },
      data: { balance: poolAfter }
    });

    // Create transfer record
    const t = await tx.transfer.create({
      data: {
        urc,
        senderId,
        senderName: sender.name,
        senderEmail: sender.email,
        senderMsisdn: sender.msisdn,
        agentId: agentId || null,
        recipientName,
        recipientMsisdn,
        recipientCountry,
        corridor,
        sendCurrency,
        recvCurrency,
        sendAmount: sendAmt,
        recvAmount: recvAmt,
        fxRate: fxRate.clientRate,
        fxRateId: fxRate.id,
        fee,
        totalCharged,
        fundingMethod,
        payoutMethod,
        status: fundingMethod === 'wallet' ? 'PENDING_APPROVAL' : 'INITIATED',
        fundsReceivedAt: fundingMethod === 'wallet' ? new Date() : null,
        pendingApprovalAt: fundingMethod === 'wallet' ? new Date() : null,
      }
    });

    // Platform pool ledger entry
    await tx.platformLedger.create({
      data: {
        accountId: destPool.id,
        transferId: t.id,
        type: 'payout',
        amount: recvAmt,
        direction: 'debit',
        balanceBefore: poolBefore,
        balanceAfter: poolAfter,
        description: `Reserved ${recvCurrency} for transfer ${urc}`
      }
    });

    // Audit
    await tx.auditLog.create({
      data: {
        entityType: 'transfer', entityId: t.id,
        action: 'initiate_transfer',
        actorId: senderId, actorRole: sender.role,
        payload: { urc, corridor, sendAmount, recvAmount: recvAmt.toString(), fxRate: fxRate.clientRate },
        requestId
      }
    });

    return t;
  });

  // Notify sender
  await notifQueue.add('send_email', {
    template: 'transfer_initiated',
    to: sender.email,
    data: {
      name: sender.name,
      urc: transfer.urc,
      sendAmount: sendAmt.toString(),
      sendCurrency,
      recvAmount: recvAmt.toString(),
      recvCurrency,
      recipientName,
      recipientMsisdn
    },
    idempotency_key: `transfer_initiated_${transfer.id}`
  });

  // If MoMo funding, trigger MoMo collection
  if (fundingMethod === 'momo') {
    await triggerMomoCollection(transfer, sender, requestId);
  }

  // Webhook event
  try {
    const webhookService = require('./webhookService');
    await webhookService.createWebhookEvent(transfer.id, 'status_changed', { urc: transfer.urc, status: transfer.status, corridor });
  } catch (_) {}

  // Real-time socket update to sender
  emitSocketEvent('transfer:update', senderId, { transferId: transfer.id, urc: transfer.urc, status: transfer.status });

  // Credit commission if agent-initiated
  if (agentId) {
    try {
      const agentService = require('./agentService');
      await agentService.creditCommission(transfer.id, agentId, sendAmount, sendCurrency);
    } catch (_) {}
  }

  logger.info({ msg: 'Transfer initiated', transferId: transfer.id, urc: transfer.urc, requestId });
  return transfer;
}

/**
 * Step 4: Admin approves a pending transfer.
 * Triggers MoMo payout to recipient.
 */
async function approveTransfer(transferId, adminId, adminNote, requestId) {
  const transfer = await prisma.transfer.findUnique({ where: { id: transferId } });
  if (!transfer) throw Object.assign(new Error('Transfer not found'), { status: 404 });
  if (transfer.status !== 'PENDING_APPROVAL') {
    throw Object.assign(new Error(`Cannot approve transfer in status: ${transfer.status}`), { status: 409 });
  }

  const admin = await prisma.user.findUnique({ where: { id: adminId } });

  // Update to APPROVED
  const updated = await prisma.$transaction(async (tx) => {
    const t = await tx.transfer.update({
      where: { id: transferId },
      data: {
        status: 'APPROVED',
        adminId,
        adminNote: adminNote || null,
        approvedAt: new Date(),
      }
    });

    await tx.auditLog.create({
      data: {
        entityType: 'transfer', entityId: transferId,
        action: 'approve',
        actorId: adminId, actorRole: 'admin',
        payload: { adminNote }, requestId
      }
    });

    return t;
  });

  // Notify sender of approval
  await notifQueue.add('send_email', {
    template: 'transfer_approved',
    to: transfer.senderEmail,
    data: {
      name: transfer.senderName,
      urc: transfer.urc,
      recvAmount: transfer.recvAmount.toString(),
      recvCurrency: transfer.recvCurrency,
      recipientName: transfer.recipientName,
      recipientMsisdn: transfer.recipientMsisdn,
    },
    idempotency_key: `approved_${transferId}`
  });

  // Trigger MoMo payout to recipient
  await triggerMomoPayout(updated, requestId);

  // Webhook event + socket
  try {
    const webhookService = require('./webhookService');
    await webhookService.createWebhookEvent(transferId, 'status_changed', { urc: updated.urc, status: 'APPROVED' });
  } catch (_) {}
  emitSocketEvent('transfer:update', updated.senderId, { transferId, urc: updated.urc, status: 'APPROVED' });
  emitSocketEvent('transfer:update', 'admin_room', { transferId, urc: updated.urc, status: 'APPROVED' });

  logger.info({ msg: 'Transfer approved', transferId, adminId, requestId });
  return updated;
}

/**
 * Admin rejects a transfer — reverses pool reservation, refunds sender.
 */
async function rejectTransfer(transferId, adminId, rejectionReason, requestId) {
  const transfer = await prisma.transfer.findUnique({ where: { id: transferId } });
  if (!transfer) throw Object.assign(new Error('Transfer not found'), { status: 404 });
  if (transfer.status !== 'PENDING_APPROVAL') {
    throw Object.assign(new Error(`Cannot reject transfer in status: ${transfer.status}`), { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    // Reverse platform pool reservation
    const pool = await tx.platformAccount.findUnique({ where: { currency: transfer.recvCurrency } });
    const poolBefore = new Decimal(pool.balance.toString());
    const poolAfter = poolBefore.plus(new Decimal(transfer.recvAmount.toString()));

    await tx.platformAccount.update({ where: { id: pool.id }, data: { balance: poolAfter } });
    await tx.platformLedger.create({
      data: {
        accountId: pool.id, transferId,
        type: 'reversal', amount: transfer.recvAmount,
        direction: 'credit', balanceBefore: poolBefore, balanceAfter: poolAfter,
        description: `Reversal: rejected transfer ${transfer.urc}`
      }
    });

    // Refund sender wallet if wallet-funded
    if (transfer.fundingMethod === 'wallet') {
      const wallet = await tx.clientWallet.findUnique({ where: { userId: transfer.senderId } });
      const wBefore = new Decimal(wallet.balance.toString());
      const wAfter = wBefore.plus(new Decimal(transfer.totalCharged.toString()));
      await tx.clientWallet.update({ where: { id: wallet.id }, data: { balance: wAfter } });
      await tx.clientLedger.create({
        data: {
          walletId: wallet.id, type: 'refund',
          amount: transfer.totalCharged, direction: 'credit',
          balanceBefore: wBefore, balanceAfter: wAfter,
          reference: transferId,
          description: `Refund: rejected transfer ${transfer.urc}`
        }
      });
    }

    // Update transfer
    await tx.transfer.update({
      where: { id: transferId },
      data: { status: 'REJECTED', adminId, rejectionReason, rejectedAt: new Date() }
    });

    await tx.auditLog.create({
      data: {
        entityType: 'transfer', entityId: transferId,
        action: 'reject', actorId: adminId, actorRole: 'admin',
        payload: { rejectionReason }, requestId
      }
    });
  });

  await notifQueue.add('send_email', {
    template: 'transfer_rejected',
    to: transfer.senderEmail,
    data: {
      name: transfer.senderName,
      urc: transfer.urc,
      sendAmount: transfer.sendAmount.toString(),
      sendCurrency: transfer.sendCurrency,
      rejectionReason,
      willRefund: transfer.fundingMethod === 'wallet'
    },
    idempotency_key: `rejected_${transferId}`
  });

  // Webhook event + socket
  try {
    const webhookService = require('./webhookService');
    await webhookService.createWebhookEvent(transferId, 'status_changed', { urc: transfer.urc, status: 'REJECTED' });
  } catch (_) {}
  emitSocketEvent('transfer:update', transfer.senderId, { transferId, urc: transfer.urc, status: 'REJECTED' });

  logger.info({ msg: 'Transfer rejected', transferId, adminId, requestId });
}

/**
 * Called by MoMo service (internal) when collection succeeds.
 */
async function confirmMomoCollection(urc, momoRef, requestId) {
  const transfer = await prisma.transfer.findUnique({ where: { urc } });
  if (!transfer) throw Object.assign(new Error('Transfer not found'), { status: 404 });
  if (transfer.status !== 'INITIATED') return; // idempotent

  await prisma.transfer.update({
    where: { urc },
    data: {
      status: 'PENDING_APPROVAL',
      momoCollectionRef: momoRef,
      fundsReceivedAt: new Date(),
      pendingApprovalAt: new Date(),
    }
  });

  await prisma.auditLog.create({
    data: {
      entityType: 'transfer', entityId: transfer.id,
      action: 'momo_collection_confirmed',
      payload: { momoRef }, requestId
    }
  });

  logger.info({ msg: 'MoMo collection confirmed', urc, momoRef, requestId });
}

/**
 * Called by MoMo service (internal) when payout succeeds.
 */
async function confirmMomoPayout(urc, momoRef, requestId) {
  const transfer = await prisma.transfer.findUnique({ where: { urc } });
  if (!transfer || transfer.status === 'COMPLETED') return; // idempotent

  await prisma.$transaction(async (tx) => {
    // Credit source pool (RWF now in platform possession)
    const srcPool = await tx.platformAccount.findUnique({ where: { currency: transfer.sendCurrency } });
    if (srcPool) {
      const before = new Decimal(srcPool.balance.toString());
      const after = before.plus(new Decimal(transfer.sendAmount.toString()));
      await tx.platformAccount.update({ where: { id: srcPool.id }, data: { balance: after } });
      await tx.platformLedger.create({
        data: {
          accountId: srcPool.id, transferId: transfer.id,
          type: 'collection', amount: transfer.sendAmount,
          direction: 'credit', balanceBefore: before, balanceAfter: after,
          description: `Collected ${transfer.sendCurrency} for transfer ${urc}`
        }
      });
    }

    await tx.transfer.update({
      where: { urc },
      data: { status: 'COMPLETED', momoPayoutRef: momoRef, completedAt: new Date() }
    });

    await tx.auditLog.create({
      data: {
        entityType: 'transfer', entityId: transfer.id,
        action: 'completed', payload: { momoRef }, requestId
      }
    });
  });

  await notifQueue.add('send_email', {
    template: 'transfer_completed',
    to: transfer.senderEmail,
    data: {
      name: transfer.senderName,
      urc: transfer.urc,
      recvAmount: transfer.recvAmount.toString(),
      recvCurrency: transfer.recvCurrency,
      recipientName: transfer.recipientName,
    },
    idempotency_key: `completed_${transfer.id}`
  });

  // Webhook event + socket
  try {
    const webhookService = require('./webhookService');
    await webhookService.createWebhookEvent(transfer.id, 'completed', { urc, status: 'COMPLETED' });
  } catch (_) {}
  emitSocketEvent('transfer:update', transfer.senderId, { transferId: transfer.id, urc, status: 'COMPLETED' });

  logger.info({ msg: 'Transfer completed', urc, momoRef, requestId });
}

// ── Internal helpers ──────────────────────────────────────────────────────────
async function getLockedRate(corridor) {
  const rate = await prisma.forexRate.findFirst({
    where: { corridor },
    orderBy: { fetchedAt: 'desc' }
  });

  if (!rate) throw Object.assign(new Error(`No FX rate available for corridor ${corridor}`), { status: 503 });

  const ageMinutes = (Date.now() - rate.fetchedAt.getTime()) / 60000;
  if (ageMinutes > STALE_MINUTES) {
    throw Object.assign(new Error('FX rates are stale. New transfers temporarily suspended.'), { status: 503 });
  }

  return rate;
}

async function triggerMomoCollection(transfer, sender, requestId) {
  try {
    await axios.post(
      `${process.env.MOMO_SERVICE_URL}/internal/v1/momo/collect`,
      {
        urc: transfer.urc,
        amount: transfer.totalCharged.toString(),
        currency: transfer.sendCurrency,
        msisdn: sender.msisdn,
        country: sender.country || 'RW',
      },
      { headers: { 'X-Service-Token': generateServiceToken(), 'X-Request-Id': requestId } }
    );
  } catch (err) {
    logger.error({ msg: 'MoMo collection trigger failed', urc: transfer.urc, error: err.message });
    // Don't throw — transfer already created; MoMo can be retried
  }
}

async function triggerMomoPayout(transfer, requestId) {
  try {
    await axios.post(
      `${process.env.MOMO_SERVICE_URL}/internal/v1/momo/disburse`,
      {
        urc: transfer.urc,
        amount: transfer.recvAmount.toString(),
        currency: transfer.recvCurrency,
        msisdn: transfer.recipientMsisdn,
        country: transfer.recipientCountry,
        recipientName: transfer.recipientName,
      },
      { headers: { 'X-Service-Token': generateServiceToken(), 'X-Request-Id': requestId } }
    );

    await prisma.transfer.update({
      where: { id: transfer.id },
      data: { status: 'PAYOUT_INITIATED', payoutInitiatedAt: new Date() }
    });
  } catch (err) {
    logger.error({ msg: 'MoMo payout trigger failed', urc: transfer.urc, error: err.message });
    // Mark as APPROVED — payout can be retried manually
  }
}

function generateServiceToken() {
  const jwt = require('jsonwebtoken');
  return jwt.sign({ sub: 'service:core' }, process.env.SERVICE_JWT_SECRET, { expiresIn: '5m' });
}

async function retryTransfer(transferId, adminId) {
  const transfer = await prisma.transfer.findUnique({ where: { id: transferId } });
  if (!transfer) throw Object.assign(new Error('Transfer not found'), { statusCode: 404 });
  if (transfer.status !== 'FAILED') {
    throw Object.assign(new Error('Only FAILED transfers can be retried'), { statusCode: 409 });
  }
  const updated = await prisma.transfer.update({
    where: { id: transferId },
    data: { status: 'APPROVED', retryCount: { increment: 1 }, failedAt: null },
  });
  await triggerMomoPayout(updated, null);
  return updated;
}

async function reverseTransfer(transferId, adminId, reason, requestId) {
  const transfer = await prisma.transfer.findUnique({ where: { id: transferId } });
  if (!transfer) throw Object.assign(new Error('Transfer not found'), { statusCode: 404 });
  if (!['COMPLETED', 'APPROVED'].includes(transfer.status)) {
    throw Object.assign(new Error('Only COMPLETED or APPROVED transfers can be reversed'), { statusCode: 409 });
  }

  await prisma.$transaction(async (tx) => {
    // Reverse pool changes
    const pool = await tx.platformAccount.findUnique({ where: { currency: transfer.recvCurrency } });
    if (pool) {
      const before = new Decimal(pool.balance.toString());
      const after = before.plus(new Decimal(transfer.recvAmount.toString()));
      await tx.platformAccount.update({ where: { id: pool.id }, data: { balance: after } });
      await tx.platformLedger.create({
        data: {
          accountId: pool.id, transferId, type: 'reversal',
          amount: transfer.recvAmount, direction: 'credit',
          balanceBefore: before, balanceAfter: after,
          description: `Manual reversal: ${transfer.urc}`,
        },
      });
    }
    await tx.transfer.update({
      where: { id: transferId },
      data: { status: 'REVERSED', adminId, adminNote: reason, reversedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        entityType: 'transfer', entityId: transferId,
        action: 'reverse', actorId: adminId, actorRole: 'admin',
        payload: { reason }, requestId,
      },
    });
  });

  try {
    const webhookService = require('./webhookService');
    await webhookService.createWebhookEvent(transferId, 'status_changed', { urc: transfer.urc, status: 'REVERSED' });
  } catch (_) {}
  emitSocketEvent('transfer:update', transfer.senderId, { transferId, urc: transfer.urc, status: 'REVERSED' });
}

module.exports = { initiateTransfer, approveTransfer, rejectTransfer, confirmMomoCollection, confirmMomoPayout, retryTransfer, reverseTransfer };
