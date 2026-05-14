const express = require('express');
const router = express.Router();
const { authenticate, authorize, ROLES } = require('../middleware/auth');
const agentService = require('../services/agentService');
const transferService = require('./transfers'); // re-uses existing initiate logic
const { z } = require('zod');

const registerClientSchema = z.object({
  email: z.string().email().transform(v => v.toLowerCase().trim()),
  name: z.string().min(2).max(100).trim(),
  country: z.string().optional(),
  msisdn: z.string().regex(/^\+[1-9]\d{7,14}$/).optional(),
});

router.post('/clients', authenticate, authorize(ROLES.AGENT), async (req, res, next) => {
  try {
    const parsed = registerClientSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    const { client, tempPassword } = await agentService.registerClient(req.user.id, parsed.data);
    res.status(201).json({ client: { ...client, passwordHash: undefined }, tempPassword });
  } catch (err) { next(err); }
});

router.get('/clients', authenticate, authorize(ROLES.AGENT), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await agentService.listClients(req.user.id, page, limit);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/transfers', authenticate, authorize(ROLES.AGENT), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await agentService.getAgentTransfers(req.user.id, { status: req.query.status }, page, limit);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/commissions', authenticate, authorize(ROLES.AGENT), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await agentService.getCommissions(req.user.id, page, limit);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/float', authenticate, authorize(ROLES.AGENT), async (req, res, next) => {
  try {
    const result = await agentService.getFloatBalance(req.user.id);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/profile', authenticate, authorize(ROLES.AGENT), async (req, res, next) => {
  try {
    const profile = await agentService.getOrCreateProfile(req.user.id);
    res.json(profile);
  } catch (err) { next(err); }
});

module.exports = router;
