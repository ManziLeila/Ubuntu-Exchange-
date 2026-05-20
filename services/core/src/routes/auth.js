const express = require('express');
const rateLimit = require('express-rate-limit');
const { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } = require('../middleware/validate');
const authService = require('../services/authService');

const { authenticate } = require('../middleware/auth');
const { agentUpload } = require('../middleware/upload');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, please try again later.' }
});

/**
 * POST /api/v1/auth/register
 */
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await authService.register(data, req.requestId);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

/**
 * POST /api/v1/auth/login
 */
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.login(email, password, req.requestId);

    // Set refresh token in HttpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ user: result.user, accessToken: result.accessToken });
  } catch (err) { next(err); }
});

/**
 * POST /api/v1/auth/google
 */
router.post('/google', authLimiter, async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'idToken is required' });
    const result = await authService.googleAuth(idToken, req.requestId);
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ user: result.user, accessToken: result.accessToken });
  } catch (err) { next(err); }
});

/**
 * POST /api/v1/auth/refresh
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ error: 'No refresh token' });

    const tokens = await authService.refreshToken(token);
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ accessToken: tokens.accessToken });
  } catch (err) { next(err); }
});

/**
 * POST /api/v1/auth/logout
 */
router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
});

/**
 * POST /api/v1/auth/verify-email
 */
router.post('/verify-email', authLimiter, async (req, res, next) => {
  try {
    const { userId, otpId, code } = req.body;
    if (!userId || !otpId || !code) {
      return res.status(400).json({ error: 'userId, otpId, and code are required' });
    }
    await authService.verifyEmail(userId, otpId, code);
    res.json({ message: 'Email verified successfully. You can now sign in.' });
  } catch (err) { next(err); }
});

/**
 * POST /api/v1/auth/resend-otp
 */
router.post('/resend-otp', authLimiter, async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const result = await authService.resendVerificationOtp(userId);
    res.json({ ...result, message: 'OTP sent to your email address.' });
  } catch (err) { next(err); }
});

/**
 * POST /api/v1/auth/forgot-password
 */
router.post('/forgot-password', authLimiter, async (req, res, next) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    await authService.forgotPassword(email, req.requestId);
    // Always return success to prevent user enumeration
    res.json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (err) { next(err); }
});

/**
 * POST /api/v1/auth/reset-password
 */
router.post('/reset-password', authLimiter, async (req, res, next) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    await authService.resetPassword(token, password, req.requestId);
    res.json({ message: 'Password updated successfully.' });
  } catch (err) { next(err); }
});

/**
 * POST /api/v1/auth/agent-apply
 * Public endpoint — creates agent user (status=pending) + stores KYB docs
 */
router.post('/agent-apply', authLimiter,
  agentUpload.fields([
    { name: 'id_document',    maxCount: 1 },
    { name: 'business_cert',  maxCount: 1 },
    { name: 'tin_cert',       maxCount: 1 },
    { name: 'proof_address',  maxCount: 1 },
    { name: 'signed_contract',maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      const prisma = require('../utils/prisma');
      const bcrypt = require('bcrypt');
      const { name, email, password, msisdn, country, businessName, businessRegNumber, tinNumber, territory, bankName, bankAccount } = req.body;

      if (!name || !email || !password || !businessName) {
        return res.status(400).json({ error: 'Missing required fields: name, email, password, businessName' });
      }

      const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
      if (existing) return res.status(409).json({ error: 'Email already registered' });

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: {
          name: name.trim(),
          email: email.toLowerCase().trim(),
          passwordHash,
          role: 'agent',
          status: 'suspended', // requires admin approval
          country: country || null,
          msisdn: msisdn || null,
        },
      });

      // Create agent profile
      await prisma.agentProfile.create({
        data: {
          agentId: user.id,
          territory: territory || country || null,
          licenseNumber: businessRegNumber || null,
        },
      });

      // Store KYB metadata as a KYC application
      await prisma.kycApplication.create({
        data: {
          userId: user.id,
          status: 'PENDING',
          reviewNotes: JSON.stringify({ businessName, businessRegNumber, tinNumber, bankName, bankAccount }),
        },
      });

      // Store uploaded documents as KycDocument records
      const files = req.files || {};
      const docEntries = [
        { field: 'id_document',    type: 'national_id' },
        { field: 'business_cert',  type: 'business_certificate' },
        { field: 'tin_cert',       type: 'tin_certificate' },
        { field: 'proof_address',  type: 'proof_of_address' },
        { field: 'signed_contract',type: 'signed_contract' },
      ];
      for (const { field, type } of docEntries) {
        const f = files[field]?.[0];
        if (!f) continue;
        await prisma.kycDocument.create({
          data: {
            userId: user.id,
            type,
            fileUrl: `/uploads/agent-applications/${email.replace(/[^a-z0-9]/gi, '_')}/${f.filename}`,
            fileName: f.originalname,
            mimeType: f.mimetype,
            status: 'PENDING',
          },
        });
      }

      // Notify admin room via Socket.io
      if (global.io) global.io.to('admin_room').emit('kyc:updated', { userId: user.id, status: 'PENDING', type: 'agent_application' });

      const logger = require('../utils/logger');
      logger.info({ msg: 'Agent application submitted', userId: user.id, email: user.email });
      res.status(201).json({ message: 'Application submitted successfully. An admin will review and activate your account within 48 hours.' });
    } catch (err) { next(err); }
  }
);

/**
 * GET /api/v1/auth/me
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const prisma = require('../utils/prisma');
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { passwordHash, resetToken, resetTokenExpiresAt, loginAttempts, lockedUntil, ...safe } = user;
    res.json({ user: safe });
  } catch (err) { next(err); }
});

/**
 * PUT /api/v1/auth/profile
 */
router.put('/profile', authenticate, async (req, res, next) => {
  try {
    const prisma = require('../utils/prisma');
    const { name, msisdn, country } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

    const updated = await prisma.user.update({
      where: { id: req.user.sub },
      data: {
        name: name.trim(),
        msisdn: msisdn?.trim() || null,
        country: country?.trim() || null,
      },
    });

    const { passwordHash, resetToken, resetTokenExpiresAt, loginAttempts, lockedUntil, ...safe } = updated;
    res.json({ user: safe });
  } catch (err) { next(err); }
});

/**
 * PUT /api/v1/auth/change-password
 */
router.put('/change-password', authenticate, async (req, res, next) => {
  try {
    const bcrypt = require('bcrypt');
    const prisma = require('../utils/prisma');
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });

    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.passwordHash) return res.status(400).json({ error: 'Password login is not available for this account' });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user.sub }, data: { passwordHash: newHash } });

    res.json({ message: 'Password updated successfully' });
  } catch (err) { next(err); }
});

module.exports = router;
