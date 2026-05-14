const prisma = require('../utils/prisma');
const logger = require('../utils/logger');

const HIGH_RISK_COUNTRIES = ['KP', 'IR', 'SY', 'MM', 'BY', 'CU'];
const LARGE_TX_THRESHOLD_RWF = 5_000_000;
const VELOCITY_WINDOW_MINUTES = 60;
const VELOCITY_MAX_TRANSFERS = 5;

async function getSystemConfig(key, defaultVal) {
  try {
    const cfg = await prisma.systemConfig.findUnique({ where: { key } });
    if (!cfg) return defaultVal;
    return cfg.value;
  } catch { return defaultVal; }
}

async function checkVelocity(userId) {
  const since = new Date(Date.now() - VELOCITY_WINDOW_MINUTES * 60 * 1000);
  const count = await prisma.transfer.count({
    where: {
      senderId: userId,
      createdAt: { gte: since },
      status: { notIn: ['CANCELLED', 'REJECTED', 'FAILED'] },
    },
  });
  const max = await getSystemConfig('fraud.velocity_max_transfers', VELOCITY_MAX_TRANSFERS);
  return count >= max;
}

async function checkLargeTransaction(amount, currency) {
  const threshold = await getSystemConfig('fraud.large_tx_threshold_rwf', LARGE_TX_THRESHOLD_RWF);
  if (currency !== 'RWF') return false;
  return parseFloat(amount) >= threshold;
}

function checkSuspiciousCountry(corridor) {
  const toCcy = corridor?.split('_')[1];
  return HIGH_RISK_COUNTRIES.some(c => corridor?.includes(c) || toCcy?.includes(c));
}

async function checkBlacklist(userId) {
  const alert = await prisma.fraudAlert.findFirst({
    where: { userId, type: 'blacklist_hit', status: { in: ['OPEN', 'INVESTIGATING'] } },
  });
  return !!alert;
}

async function checkFailedOtp(userId) {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const failed = await prisma.otpCode.count({
    where: { userId, failedAttempts: { gt: 3 }, createdAt: { gte: since } },
  });
  return failed >= 2;
}

async function runPreChecks(userId, amount, corridor, ipAddress, deviceId) {
  const flags = [];
  let score = 0;

  try {
    if (await checkBlacklist(userId)) { flags.push('BLACKLIST_HIT'); score += 100; }
    if (await checkVelocity(userId)) { flags.push('VELOCITY_BREACH'); score += 40; }
    if (await checkLargeTransaction(amount, corridor?.split('_')[0])) { flags.push('LARGE_TRANSACTION'); score += 30; }
    if (checkSuspiciousCountry(corridor)) { flags.push('SUSPICIOUS_COUNTRY'); score += 25; }
    if (await checkFailedOtp(userId)) { flags.push('FAILED_OTP_PATTERN'); score += 20; }
  } catch (err) {
    logger.warn({ msg: 'Fraud check sub-error', error: err.message });
  }

  const level = score >= 100 ? 'CRITICAL' : score >= 60 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW';

  if (level === 'HIGH' || level === 'CRITICAL') {
    logger.warn({ msg: 'Fraud flags raised', userId, score, level, flags });
  }

  return { score, level, flags };
}

async function createAlert(type, severity, userId, transferId, details) {
  try {
    const alert = await prisma.fraudAlert.create({
      data: { type, severity, userId, transferId, details, status: 'OPEN' },
    });

    // Broadcast to compliance room via Socket.io
    const io = global.io;
    if (io) {
      io.to('admin_room').emit('fraud:alert', { alertId: alert.id, type, severity, userId, transferId });
    }

    return alert;
  } catch (err) {
    logger.error({ msg: 'Failed to create fraud alert', error: err.message });
    return null;
  }
}

async function resolveAlert(alertId, resolvedById, status, resolution) {
  return prisma.fraudAlert.update({
    where: { id: alertId },
    data: { status, resolution, resolvedBy: resolvedById, resolvedAt: new Date() },
  });
}

async function listAlerts(filters = {}, page = 1, limit = 20) {
  const where = {};
  if (filters.status) where.status = filters.status;
  if (filters.severity) where.severity = filters.severity;
  if (filters.userId) where.userId = filters.userId;

  const skip = (page - 1) * limit;
  const [alerts, total] = await Promise.all([
    prisma.fraudAlert.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.fraudAlert.count({ where }),
  ]);
  return { alerts, total, page, totalPages: Math.ceil(total / limit) };
}

module.exports = { runPreChecks, createAlert, resolveAlert, listAlerts, checkVelocity, checkLargeTransaction };
