const express = require('express');
const { authenticate, authorize, requireKyc } = require('../middleware/auth');
const { initiateTransferSchema, approveTransferSchema, rejectTransferSchema } = require('../middleware/validate');
const transferService = require('../services/transferService');
const prisma = require('../utils/prisma');

const router = express.Router();

/**
 * POST /api/v1/transfers — Initiate a transfer (client or agent)
 */
router.post('/', authenticate, requireKyc, async (req, res, next) => {
  try {
    const data = initiateTransferSchema.parse(req.body);
    const transfer = await transferService.initiateTransfer(req.user.sub, data, req.requestId);
    res.status(201).json({ transfer });
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/transfers — List own transfers
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      senderId: req.user.sub,
      ...(status && { status })
    };

    const [transfers, total] = await Promise.all([
      prisma.transfer.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
      prisma.transfer.count({ where })
    ]);

    res.json({ transfers, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/transfers/:urc — Get transfer by URC
 */
router.get('/:urc', authenticate, async (req, res, next) => {
  try {
    const transfer = await prisma.transfer.findUnique({ where: { urc: req.params.urc } });
    if (!transfer) return res.status(404).json({ error: 'Transfer not found' });

    // Clients can only see their own transfers
    if (req.user.role === 'client' && transfer.senderId !== req.user.sub) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json({ transfer });
  } catch (err) { next(err); }
});

// ── Admin only ────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/transfers — List all transfers (admin)
 */
router.get('/admin/all', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status, corridor } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {
      ...(status && { status }),
      ...(corridor && { corridor })
    };

    const [transfers, total] = await Promise.all([
      prisma.transfer.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
      prisma.transfer.count({ where })
    ]);

    res.json({ transfers, total });
  } catch (err) { next(err); }
});

/**
 * POST /api/v1/transfers/:id/approve
 */
router.post('/:id/approve', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { adminNote } = approveTransferSchema.parse(req.body);
    const transfer = await transferService.approveTransfer(req.params.id, req.user.sub, adminNote, req.requestId);
    res.json({ transfer });
  } catch (err) { next(err); }
});

/**
 * POST /api/v1/transfers/:id/reject
 */
router.post('/:id/reject', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { rejectionReason } = rejectTransferSchema.parse(req.body);
    await transferService.rejectTransfer(req.params.id, req.user.sub, rejectionReason, req.requestId);
    res.json({ message: 'Transfer rejected and sender notified.' });
  } catch (err) { next(err); }
});

module.exports = router;
