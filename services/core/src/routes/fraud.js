const express = require('express');
const router = express.Router();
const { authenticate, authorize, ROLES } = require('../middleware/auth');
const fraudService = require('../services/fraudService');
const { fraudResolutionSchema } = require('../middleware/validate');
const { getAmlProvider } = require('../integrations');

const STAFF = [ROLES.ADMIN];

router.get('/alerts', authenticate, authorize(...STAFF), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await fraudService.listAlerts(
      { status: req.query.status, severity: req.query.severity, userId: req.query.userId },
      page, limit
    );
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/alerts/:id', authenticate, authorize(...STAFF), async (req, res, next) => {
  try {
    const prisma = require('../utils/prisma');
    const alert = await prisma.fraudAlert.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    res.json(alert);
  } catch (err) { next(err); }
});

router.put('/alerts/:id/resolve', authenticate, authorize(...STAFF), async (req, res, next) => {
  try {
    const parsed = fraudResolutionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    const { status, resolution } = parsed.data;
    const result = await fraudService.resolveAlert(req.params.id, req.user.id, status, resolution);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/aml-checks', authenticate, authorize(...STAFF), async (req, res, next) => {
  try {
    const prisma = require('../utils/prisma');
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const where = {};
    if (req.query.status) where.status = req.query.status;
    const skip = (page - 1) * limit;
    const [checks, total] = await Promise.all([
      prisma.amlCheck.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.amlCheck.count({ where }),
    ]);
    res.json({ checks, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

router.post('/aml-checks/:userId', authenticate, authorize(...STAFF), async (req, res, next) => {
  try {
    const { userId } = req.params;
    const prisma = require('../utils/prisma');
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, country: true } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const provider = getAmlProvider();
    const result = await provider.screenUser(userId, { name: user.name, email: user.email, country: user.country });

    const check = await prisma.amlCheck.create({
      data: {
        userId,
        provider: result.provider,
        status: result.status,
        riskScore: result.riskScore,
        matchDetails: result.matches?.length ? result.matches : null,
      },
    });

    if (result.status === 'FLAGGED') {
      await fraudService.createAlert('aml_flag', 'HIGH', userId, null, { checkId: check.id, matches: result.matches });
    }

    res.status(201).json({ check, amlResult: result });
  } catch (err) { next(err); }
});

module.exports = router;
