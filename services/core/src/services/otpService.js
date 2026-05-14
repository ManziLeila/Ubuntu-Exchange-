const crypto = require('crypto');
const bcrypt = require('bcrypt');
const prisma = require('../utils/prisma');
const logger = require('../utils/logger');

const OTP_EXPIRY_MINUTES = 10;
const BCRYPT_ROUNDS = 6; // fast for OTP (short-lived, low-value secret)
const MAX_ATTEMPTS = 5;

function generateNumericOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

async function generateOtp(userId, purpose, reference = null) {
  // Invalidate any existing unused OTPs for the same purpose/reference
  await prisma.otpCode.updateMany({
    where: { userId, purpose, reference, isUsed: false },
    data: { isUsed: true },
  });

  const code = generateNumericOtp();
  const codeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  const otp = await prisma.otpCode.create({
    data: { userId, purpose, codeHash, reference, expiresAt },
  });

  logger.info({ msg: 'OTP generated', userId, purpose, otpId: otp.id });

  // Send OTP via email + SMS + in-app
  try {
    const Bull = require('bull');
    const notifQueue = new Bull('notifications', process.env.REDIS_URL);
    const user = await prisma.user.findUnique({ where: { id: userId } });

    // Email (primary channel)
    if (user?.email) {
      await notifQueue.add('send_email', {
        template: 'otp_code',
        to: user.email,
        data: {
          name: user.name || user.email,
          code,
          purpose,
          expiresInMinutes: OTP_EXPIRY_MINUTES,
        },
        idempotency_key: `otp_email_${otp.id}`,
      });
    }

    // SMS (secondary channel)
    if (user?.msisdn) {
      try {
        const { getSmsProvider } = require('../integrations');
        const sms = getSmsProvider();
        const msg = `Your Ubuntu Intl Exchange OTP is: ${code}. Valid for ${OTP_EXPIRY_MINUTES} min. Do not share.`;
        await sms.send(user.msisdn, msg);
      } catch (_) { /* SMS failure is non-fatal */ }
    }

    // In-app notification
    const notif = require('./notificationService');
    await notif.createInApp(userId, 'otp', 'Your OTP Code', `Your OTP is: ${code}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`, { code, purpose });
  } catch (e) {
    logger.warn({ msg: 'OTP notification failed', error: e.message });
  }

  return { otpId: otp.id, expiresAt };
}

async function verifyOtp(userId, otpId, code, purpose) {
  const otp = await prisma.otpCode.findFirst({
    where: { id: otpId, userId, purpose, isUsed: false },
  });

  if (!otp) {
    throw Object.assign(new Error('OTP not found or already used'), { statusCode: 400, code: 'OTP_INVALID' });
  }
  if (new Date() > otp.expiresAt) {
    throw Object.assign(new Error('OTP has expired'), { statusCode: 400, code: 'OTP_EXPIRED' });
  }
  if (otp.failedAttempts >= MAX_ATTEMPTS) {
    await prisma.otpCode.update({ where: { id: otpId }, data: { isUsed: true } });
    throw Object.assign(new Error('Too many failed attempts. Request a new OTP.'), { statusCode: 429, code: 'OTP_MAX_ATTEMPTS' });
  }

  const match = await bcrypt.compare(code, otp.codeHash);
  if (!match) {
    await prisma.otpCode.update({ where: { id: otpId }, data: { failedAttempts: { increment: 1 } } });
    const remaining = MAX_ATTEMPTS - otp.failedAttempts - 1;
    throw Object.assign(new Error(`Invalid OTP. ${remaining} attempts remaining.`), { statusCode: 400, code: 'OTP_WRONG' });
  }

  await prisma.otpCode.update({ where: { id: otpId }, data: { isUsed: true, usedAt: new Date() } });
  logger.info({ msg: 'OTP verified successfully', userId, otpId, purpose });
  return true;
}

module.exports = { generateOtp, verifyOtp };
