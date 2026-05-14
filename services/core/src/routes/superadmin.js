const express = require('express');
const router = express.Router();
const { authenticate, authorize, ROLES } = require('../middleware/auth');
const { systemConfigSchema, transactionLimitSchema } = require('../middleware/validate');
const prisma = require('../utils/prisma');

router.get('/config', authenticate, authorize(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const configs = await prisma.systemConfig.findMany({ orderBy: [{ category: 'asc' }, { key: 'asc' }] });
    res.json({ configs });
  } catch (err) { next(err); }
});

router.put('/config/:key', authenticate, authorize(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const parsed = systemConfigSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    const config = await prisma.systemConfig.upsert({
      where: { key: req.params.key },
      update: { value: parsed.data.value, description: parsed.data.description, updatedBy: req.user.id, category: parsed.data.category },
      create: { key: req.params.key, value: parsed.data.value, description: parsed.data.description, updatedBy: req.user.id, category: parsed.data.category || 'general' },
    });
    res.json(config);
  } catch (err) { next(err); }
});

router.get('/users', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const where = {};
    if (req.query.role) where.role = req.query.role;
    if (req.query.status) where.status = req.query.status;
    if (req.query.search) {
      where.OR = [
        { name: { contains: req.query.search, mode: 'insensitive' } },
        { email: { contains: req.query.search, mode: 'insensitive' } },
      ];
    }
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, role: true, status: true, country: true, msisdn: true, createdAt: true, loginAttempts: true, lockedUntil: true },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      prisma.user.count({ where }),
    ]);
    res.json({ users, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

router.put('/users/:id/role', authenticate, authorize(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const validRoles = Object.values(ROLES);
    if (!validRoles.includes(req.body.role)) {
      return res.status(400).json({ error: `Invalid role. Valid roles: ${validRoles.join(', ')}` });
    }
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role: req.body.role },
      select: { id: true, name: true, email: true, role: true },
    });
    res.json(user);
  } catch (err) { next(err); }
});

router.put('/users/:id/status', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { status },
      select: { id: true, name: true, email: true, status: true },
    });
    res.json(user);
  } catch (err) { next(err); }
});

router.get('/audit', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.COMPLIANCE), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const where = {};
    if (req.query.actorId) where.actorId = req.query.actorId;
    if (req.query.entityType) where.entityType = req.query.entityType;
    if (req.query.action) where.action = req.query.action;
    if (req.query.dateFrom || req.query.dateTo) {
      where.createdAt = {};
      if (req.query.dateFrom) where.createdAt.gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) where.createdAt.lte = new Date(req.query.dateTo);
    }
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take: limit,
        include: { actor: { select: { id: true, name: true, email: true, role: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ logs, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

router.get('/platform-stats', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res, next) => {
  try {
    const [
      totalUsers, totalTransfers, totalAgents, completedTransfers,
      pendingTransfers, totalRevenue, openAlerts, platformAccounts,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.transfer.count(),
      prisma.user.count({ where: { role: 'agent' } }),
      prisma.transfer.count({ where: { status: 'COMPLETED' } }),
      prisma.transfer.count({ where: { status: 'PENDING_APPROVAL' } }),
      prisma.transfer.aggregate({ where: { status: 'COMPLETED' }, _sum: { fee: true } }),
      prisma.fraudAlert.count({ where: { status: 'OPEN' } }),
      prisma.platformAccount.findMany(),
    ]);
    res.json({
      totalUsers, totalTransfers, totalAgents, completedTransfers,
      pendingTransfers, openAlerts,
      totalRevenue: totalRevenue._sum.fee || 0,
      platformAccounts,
    });
  } catch (err) { next(err); }
});

router.post('/limits', authenticate, authorize(ROLES.SUPER_ADMIN), async (req, res, next) => {
  try {
    const parsed = transactionLimitSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    const { role, maxSingleAmount, maxDailyAmount, maxMonthlyAmount, currency } = parsed.data;
    const key = `limits.${role}`;
    const config = await prisma.systemConfig.upsert({
      where: { key },
      update: { value: { maxSingleAmount, maxDailyAmount, maxMonthlyAmount, currency: currency || 'RWF' }, updatedBy: req.user.id },
      create: { key, value: { maxSingleAmount, maxDailyAmount, maxMonthlyAmount, currency: currency || 'RWF' }, category: 'limits', updatedBy: req.user.id },
    });
    res.json(config);
  } catch (err) { next(err); }
});

module.exports = router;
