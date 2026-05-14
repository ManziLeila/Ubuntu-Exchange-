const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const otpService = require('../services/otpService');
const { otpRequestSchema, otpVerifySchema } = require('../middleware/validate');

router.post('/request', authenticate, async (req, res, next) => {
  try {
    const parsed = otpRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    const { purpose, reference } = parsed.data;
    const result = await otpService.generateOtp(req.user.id, purpose, reference);
    res.status(201).json({ message: 'OTP sent via SMS and email', otpId: result.otpId, expiresAt: result.expiresAt });
  } catch (err) { next(err); }
});

router.post('/verify', authenticate, async (req, res, next) => {
  try {
    const parsed = otpVerifySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    const { otpId, code, purpose } = parsed.data;
    await otpService.verifyOtp(req.user.id, otpId, code, purpose);
    res.json({ valid: true, message: 'OTP verified successfully' });
  } catch (err) { next(err); }
});

module.exports = router;
