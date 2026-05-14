const express = require('express');
const { authenticate, authenticateService } = require('../middleware/auth');
const { confirmMomoCollection, confirmMomoPayout } = require('../services/transferService');
const prisma = require('../utils/prisma');

const router = express.Router();

/**
 * GET /api/v1/forex/rate?from=RWF&to=GHS
 * Public endpoint — clients see this before initiating a transfer
 */
router.get('/rate', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'from and to currency required' });

    const corridor = `${from}_${to}`;
    const rate = await prisma.forexRate.findFirst({
      where: { corridor },
      orderBy: { fetchedAt: 'desc' }
    });

    if (!rate) return res.status(404).json({ error: `No rate for ${corridor}` });

    const ageMinutes = (Date.now() - rate.fetchedAt.getTime()) / 60000;
    res.json({
      corridor,
      from,
      to,
      midRate: rate.midRate,
      clientRate: rate.clientRate,
      spreadPct: rate.spreadPct,
      fetchedAt: rate.fetchedAt,
      isStale: ageMinutes > 15,
      ageMinutes: Math.round(ageMinutes)
    });
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/forex/corridors — List all available corridors
 */
router.get('/corridors', async (req, res, next) => {
  try {
    const rates = await prisma.forexRate.findMany({
      distinct: ['corridor'],
      orderBy: [{ corridor: 'asc' }, { fetchedAt: 'desc' }]
    });
    res.json({ corridors: rates.map(r => ({ corridor: r.corridor, clientRate: r.clientRate, isStale: r.isStale })) });
  } catch (err) { next(err); }
});

/**
 * PATCH /api/v1/admin/forex/spread — Admin sets bureau spread
 */
router.patch('/spread', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { corridor, spreadPct } = req.body;
    if (!corridor || spreadPct === undefined) return res.status(400).json({ error: 'corridor and spreadPct required' });

    // Find latest rate for corridor and push an updated entry
    const latest = await prisma.forexRate.findFirst({ where: { corridor }, orderBy: { fetchedAt: 'desc' } });
    if (!latest) return res.status(404).json({ error: 'Corridor not found' });

    const newClientRate = parseFloat(latest.midRate.toString()) * (1 - spreadPct);
    const updated = await prisma.forexRate.create({
      data: {
        corridor,
        fromCcy: latest.fromCcy,
        toCcy: latest.toCcy,
        midRate: latest.midRate,
        spreadPct,
        clientRate: newClientRate,
        fetchedAt: new Date(),
        setByAdmin: true
      }
    });

    res.json({ corridor, spreadPct, clientRate: newClientRate });
  } catch (err) { next(err); }
});

// ── Internal endpoints (service-to-service only) ──────────────────────────────

/**
 * POST /internal/v1/transfers/:urc/momo-collect — MoMo service confirms collection
 */
router.post('/internal/transfers/:urc/momo-collect', authenticateService, async (req, res, next) => {
  try {
    const { momoRef } = req.body;
    await confirmMomoCollection(req.params.urc, momoRef, req.requestId);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

/**
 * POST /internal/v1/transfers/:urc/momo-payout — MoMo service confirms payout
 */
router.post('/internal/transfers/:urc/momo-payout', authenticateService, async (req, res, next) => {
  try {
    const { momoRef } = req.body;
    await confirmMomoPayout(req.params.urc, momoRef, req.requestId);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
