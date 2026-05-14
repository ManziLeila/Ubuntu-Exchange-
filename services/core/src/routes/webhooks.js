const express = require('express');
const router = express.Router();
const { authenticateService } = require('../middleware/auth');
const transferService = require('../services/transferService');
const logger = require('../utils/logger');

// MoMo collection callback
router.post('/payment/momo-collection', authenticateService, async (req, res, next) => {
  try {
    const { urc, ref, status, provider } = req.body;
    if (!urc || !ref) return res.status(400).json({ error: 'urc and ref required' });
    logger.info({ msg: 'MoMo collection callback', urc, ref, status, provider });
    if (status === 'SUCCESSFUL') {
      await transferService.confirmMomoCollection(urc, ref, req.headers['x-request-id']);
    } else {
      // Mark as FAILED
      const prisma = require('../utils/prisma');
      const transfer = await prisma.transfer.findUnique({ where: { urc } });
      if (transfer && transfer.status === 'INITIATED') {
        await prisma.transfer.update({ where: { urc }, data: { status: 'FAILED', failedAt: new Date() } });
      }
    }
    res.json({ received: true });
  } catch (err) { next(err); }
});

// MoMo payout callback
router.post('/payment/momo-payout', authenticateService, async (req, res, next) => {
  try {
    const { urc, ref, status, provider } = req.body;
    if (!urc || !ref) return res.status(400).json({ error: 'urc and ref required' });
    logger.info({ msg: 'MoMo payout callback', urc, ref, status, provider });
    if (status === 'SUCCESSFUL') {
      await transferService.confirmMomoPayout(urc, ref, req.headers['x-request-id']);
    } else {
      const prisma = require('../utils/prisma');
      await prisma.transfer.updateMany({
        where: { urc, status: { in: ['APPROVED', 'PAYOUT_INITIATED'] } },
        data: { status: 'FAILED', failedAt: new Date() },
      });
    }
    res.json({ received: true });
  } catch (err) { next(err); }
});

// Bank transfer callback
router.post('/payment/bank', authenticateService, async (req, res, next) => {
  try {
    const { urc, ref, status, type } = req.body;
    logger.info({ msg: 'Bank callback', urc, ref, status, type });
    if (status === 'SUCCESSFUL') {
      if (type === 'collection') {
        await transferService.confirmMomoCollection(urc, ref, req.headers['x-request-id']);
      } else if (type === 'payout') {
        await transferService.confirmMomoPayout(urc, ref, req.headers['x-request-id']);
      }
    }
    res.json({ received: true });
  } catch (err) { next(err); }
});

// Wise/Thunes callback
router.post('/payment/wise', authenticateService, async (req, res, next) => {
  try {
    const { urc, ref, status, type } = req.body;
    logger.info({ msg: 'Wise callback', urc, ref, status, type });
    if (status === 'SUCCESSFUL') {
      if (type === 'collection') {
        await transferService.confirmMomoCollection(urc, ref, req.headers['x-request-id']);
      } else if (type === 'payout') {
        await transferService.confirmMomoPayout(urc, ref, req.headers['x-request-id']);
      }
    }
    res.json({ received: true });
  } catch (err) { next(err); }
});

module.exports = router;
