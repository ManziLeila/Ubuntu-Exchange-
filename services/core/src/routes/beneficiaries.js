const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const beneficiaryService = require('../services/beneficiaryService');
const { beneficiarySchema } = require('../middleware/validate');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const beneficiaries = await beneficiaryService.list(req.user.id);
    res.json({ beneficiaries });
  } catch (err) { next(err); }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const parsed = beneficiarySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    const b = await beneficiaryService.create(req.user.id, parsed.data);
    res.status(201).json(b);
  } catch (err) { next(err); }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const b = await beneficiaryService.getById(req.user.id, req.params.id);
    res.json(b);
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const parsed = beneficiarySchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    const b = await beneficiaryService.update(req.user.id, req.params.id, parsed.data);
    res.json(b);
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await beneficiaryService.remove(req.user.id, req.params.id);
    res.json({ message: 'Beneficiary removed' });
  } catch (err) { next(err); }
});

module.exports = router;
