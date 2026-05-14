const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const prisma = require('../utils/prisma');
const logger = require('../utils/logger');
const { generateResetToken } = require('../utils/helpers');
const Bull = require('bull');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const notifQueue = new Bull('notifications', process.env.REDIS_URL);

const BCRYPT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 10;
const LOCKOUT_MINUTES = 30;
const WINDOW_MINUTES = 15;

async function register(data, requestId) {
  const { email, name, password, country, msisdn } = data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error('Email already registered');
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: { email, name, passwordHash, country, msisdn, role: 'client' }
    });
    // Create wallet for client
    await tx.clientWallet.create({ data: { userId: u.id, currency: 'RWF' } });
    // Audit
    await tx.auditLog.create({
      data: {
        entityType: 'user', entityId: u.id, action: 'register',
        actorId: u.id, actorRole: 'client',
        payload: { email, name }, requestId
      }
    });
    return u;
  });

  // Send welcome email
  await notifQueue.add('send_email', {
    template: 'welcome_client',
    to: email,
    data: { name },
    idempotency_key: `welcome_${user.id}`
  });

  logger.info({ msg: 'User registered', userId: user.id, requestId });
  return sanitizeUser(user);
}

async function login(email, password, requestId) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Check lockout
  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    const err = new Error('Account locked. Please try again later or check your email.');
    err.status = 423;
    throw err;
  }

  const valid = user && await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    if (user) {
      const attempts = user.loginAttempts + 1;
      const lockedUntil = attempts >= MAX_LOGIN_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
        : null;

      await prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: attempts, lockedUntil }
      });

      if (lockedUntil) {
        await notifQueue.add('send_email', {
          template: 'account_locked',
          to: user.email,
          data: { name: user.name, lockMinutes: LOCKOUT_MINUTES },
          idempotency_key: `lock_${user.id}_${Date.now()}`
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        entityType: 'session', entityId: user?.id || 'unknown',
        action: 'login_failed', payload: { email }, requestId
      }
    });

    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }

  // Reset login attempts on success
  await prisma.user.update({
    where: { id: user.id },
    data: { loginAttempts: 0, lockedUntil: null }
  });

  const tokens = generateTokens(user);

  await prisma.auditLog.create({
    data: {
      entityType: 'session', entityId: user.id,
      action: 'login', actorId: user.id, actorRole: user.role,
      payload: { email }, requestId
    }
  });

  return { user: sanitizeUser(user), ...tokens };
}

async function refreshToken(refreshToken) {
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status === 'suspended') {
      throw new Error('User not found or suspended');
    }
    return generateTokens(user);
  } catch (err) {
    const e = new Error('Invalid refresh token');
    e.status = 401;
    throw e;
  }
}

async function forgotPassword(email, requestId) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always return success to prevent user enumeration
  if (!user) return;

  const token = generateResetToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExpiresAt: expiresAt }
  });

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  await notifQueue.add('send_email', {
    template: 'password_reset',
    to: email,
    data: { name: user.name, resetUrl, expiresInHours: 1 },
    idempotency_key: `reset_${user.id}_${token}`
  });
}

async function resetPassword(token, newPassword, requestId) {
  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiresAt: { gt: new Date() }
    }
  });

  if (!user) {
    const err = new Error('Invalid or expired reset token');
    err.status = 400;
    throw err;
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExpiresAt: null, loginAttempts: 0 }
  });

  await prisma.auditLog.create({
    data: {
      entityType: 'user', entityId: user.id,
      action: 'password_reset', actorId: user.id,
      payload: {}, requestId
    }
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function generateTokens(user) {
  const payload = { sub: user.id, email: user.email, role: user.role };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30m'
  });
  const refreshToken = jwt.sign({ sub: user.id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  });
  return { accessToken, refreshToken };
}

function sanitizeUser(user) {
  const { passwordHash, resetToken, resetTokenExpiresAt, loginAttempts, lockedUntil, ...safe } = user;
  return safe;
}

async function googleAuth(idToken, requestId) {
  // Verify the Google ID token
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  const { sub: googleId, email, name, picture } = payload;

  if (!email) {
    const err = new Error('Google account has no email address');
    err.status = 400;
    throw err;
  }

  // Find existing user by googleId or email
  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId }, { email }] },
  });

  if (user) {
    // Link googleId if they previously registered with email
    if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId },
      });
    }
    if (user.status === 'suspended') {
      const err = new Error('Account suspended');
      err.status = 403;
      throw err;
    }
  } else {
    // New user — create account
    user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: { email, name, googleId, role: 'client', status: 'active' },
      });
      await tx.clientWallet.create({ data: { userId: u.id, currency: 'RWF' } });
      await tx.auditLog.create({
        data: {
          entityType: 'user', entityId: u.id, action: 'register_google',
          actorId: u.id, actorRole: 'client',
          payload: { email, name }, requestId,
        },
      });
      return u;
    });

    await notifQueue.add('send_email', {
      template: 'welcome_client',
      to: email,
      data: { name },
      idempotency_key: `welcome_${user.id}`,
    });

    logger.info({ msg: 'User registered via Google', userId: user.id, requestId });
  }

  const tokens = generateTokens(user);
  return { user: sanitizeUser(user), ...tokens };
}

module.exports = { register, login, googleAuth, refreshToken, forgotPassword, resetPassword };
