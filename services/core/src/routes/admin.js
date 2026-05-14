const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { topupLiquiditySchema } = require('../middleware/validate');
const prisma = require('../utils/prisma');
const Bull = require('bull');
const { Decimal } = require('@prisma/client/runtime/library');
const currencyService = require('../services/currencyService');

const notifQueue = new Bull('notifications', process.env.REDIS_URL);
const router = express.Router();

// All admin routes require admin role
router.use(authenticate, authorize('admin'));

/**
 * GET /api/v1/admin/liquidity — Get all platform pool balances
 */
router.get('/liquidity', async (req, res, next) => {
  try {
    const accounts = await prisma.platformAccount.findMany({
      orderBy: { currency: 'asc' },
      include: {
        ledger: { take: 10, orderBy: { createdAt: 'desc' } }
      }
    });
    res.json({ accounts });
  } catch (err) { next(err); }
});

/**
 * POST /api/v1/admin/liquidity/topup — Add funds to a liquidity pool
 */
router.post('/liquidity/topup', async (req, res, next) => {
  try {
    const { currency, amount, description } = topupLiquiditySchema.parse(req.body);

    const account = await prisma.platformAccount.findUnique({ where: { currency } });
    if (!account) return res.status(404).json({ error: `No pool for currency ${currency}` });

    const before = new Decimal(account.balance.toString());
    const after = before.plus(new Decimal(amount.toString()));

    await prisma.$transaction(async (tx) => {
      await tx.platformAccount.update({ where: { id: account.id }, data: { balance: after } });
      await tx.platformLedger.create({
        data: {
          accountId: account.id,
          type: 'top_up', amount: new Decimal(amount.toString()),
          direction: 'credit', balanceBefore: before, balanceAfter: after,
          description: description || `Admin top-up by ${req.user.email}`
        }
      });
      await tx.auditLog.create({
        data: {
          entityType: 'platform_account', entityId: account.id,
          action: 'top_up', actorId: req.user.sub, actorRole: 'admin',
          payload: { currency, amount, before: before.toString(), after: after.toString() },
          requestId: req.requestId
        }
      });
    });

    // Alert if now above threshold (was low before)
    if (before.lessThan(new Decimal(account.alertThreshold.toString()))) {
      await notifQueue.add('send_email', {
        template: 'liquidity_restored',
        to: req.user.email,
        data: { currency, newBalance: after.toString() },
        idempotency_key: `liq_restored_${account.id}_${Date.now()}`
      });
    }

    res.json({ currency, newBalance: after.toString() });
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/admin/agents — List all agents
 */
router.get('/agents', async (req, res, next) => {
  try {
    const agents = await prisma.user.findMany({
      where: { role: 'agent' },
      include: { agentWallets: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ agents: agents.map(sanitizeUser) });
  } catch (err) { next(err); }
});

/**
 * POST /api/v1/admin/agents — Create a new agent
 */
router.post('/agents', async (req, res, next) => {
  try {
    const bcrypt = require('bcrypt');
    const { email, name, country, msisdn } = req.body;
    if (!email || !name) return res.status(400).json({ error: 'email and name are required' });

    // Generate temp password
    const tempPassword = require('crypto').randomBytes(8).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const agent = await prisma.$transaction(async (tx) => {
      const a = await tx.user.create({
        data: { email, name, passwordHash, country, msisdn, role: 'agent' }
      });
      // Create RWF wallet for agent
      await tx.agentWallet.create({ data: { agentId: a.id, currency: 'RWF' } });
      await tx.auditLog.create({
        data: {
          entityType: 'user', entityId: a.id, action: 'create_agent',
          actorId: req.user.sub, actorRole: 'admin',
          payload: { email, name }, requestId: req.requestId
        }
      });
      return a;
    });

    await notifQueue.add('send_email', {
      template: 'welcome_agent',
      to: email,
      data: { name, email, tempPassword, loginUrl: `${process.env.FRONTEND_URL}/login` },
      idempotency_key: `welcome_agent_${agent.id}`
    });

    res.status(201).json({ agent: sanitizeUser(agent), note: 'Credentials sent by email.' });
  } catch (err) { next(err); }
});

/**
 * POST /api/v1/admin/agents/:agentId/wallet/topup — Top up agent wallet
 */
router.post('/agents/:agentId/wallet/topup', async (req, res, next) => {
  try {
    const { currency, amount } = req.body;
    if (!currency || !amount) return res.status(400).json({ error: 'currency and amount required' });

    const wallet = await prisma.agentWallet.findFirst({
      where: { agentId: req.params.agentId, currency }
    });
    if (!wallet) return res.status(404).json({ error: 'Agent wallet not found' });

    const before = new Decimal(wallet.balance.toString());
    const after = before.plus(new Decimal(amount.toString()));

    await prisma.$transaction(async (tx) => {
      await tx.agentWallet.update({ where: { id: wallet.id }, data: { balance: after } });
      await tx.agentLedger.create({
        data: {
          walletId: wallet.id, type: 'top_up',
          amount: new Decimal(amount.toString()), direction: 'credit',
          balanceBefore: before, balanceAfter: after,
          description: `Admin top-up by ${req.user.email}`
        }
      });
    });

    res.json({ currency, newBalance: after.toString() });
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/admin/dashboard — Summary stats
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const [
      totalTransfers,
      pendingApproval,
      completedToday,
      accounts
    ] = await Promise.all([
      prisma.transfer.count(),
      prisma.transfer.count({ where: { status: 'PENDING_APPROVAL' } }),
      prisma.transfer.count({
        where: {
          status: 'COMPLETED',
          completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        }
      }),
      prisma.platformAccount.findMany()
    ]);

    res.json({ totalTransfers, pendingApproval, completedToday, liquidityPools: accounts });
  } catch (err) { next(err); }
});

// ── Currency Management ───────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/currencies — Get all currency settings
 */
router.get('/currencies', async (req, res, next) => {
  try {
    const settings = await currencyService.getAllCurrencySettings();
    res.json({ currencies: settings });
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/admin/currencies/:corridor — Get specific currency setting
 */
router.get('/currencies/:corridor', async (req, res, next) => {
  try {
    const { corridor } = req.params;
    const setting = await currencyService.getCurrencySetting(corridor);
    res.json(setting);
  } catch (err) { next(err); }
});

/**
 * POST /api/v1/admin/currencies/:corridor/manual-rate — Set manual rate
 * Body: { manualRate: number, spread?: number }
 */
router.post('/currencies/:corridor/manual-rate', async (req, res, next) => {
  try {
    const { corridor } = req.params;
    const { manualRate, spread } = req.body;

    if (!manualRate || manualRate <= 0) {
      return res.status(400).json({ error: 'Valid manualRate required' });
    }

    const result = await currencyService.setManualRate(corridor, manualRate, spread);

    // Audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'currency_setting',
        entityId: corridor,
        action: 'set_manual_rate',
        actorId: req.user.sub,
        actorRole: 'admin',
        payload: { corridor, manualRate, spread },
        requestId: req.requestId
      }
    });

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

/**
 * POST /api/v1/admin/currencies/:corridor/automatic-mode — Enable automatic mode
 */
router.post('/currencies/:corridor/automatic-mode', async (req, res, next) => {
  try {
    const { corridor } = req.params;
    const result = await currencyService.setAutomaticMode(corridor);

    // Audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'currency_setting',
        entityId: corridor,
        action: 'set_automatic_mode',
        actorId: req.user.sub,
        actorRole: 'admin',
        payload: { corridor },
        requestId: req.requestId
      }
    });

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

/**
 * PUT /api/v1/admin/currencies/:corridor/spread — Update spread
 * Body: { spread: number (0.01 = 1%) }
 */
router.put('/currencies/:corridor/spread', async (req, res, next) => {
  try {
    const { corridor } = req.params;
    const { spread } = req.body;

    if (spread === undefined || spread < 0 || spread > 1) {
      return res.status(400).json({ error: 'Valid spread between 0 and 1 required' });
    }

    const result = await currencyService.updateSpread(corridor, spread);

    // Audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'currency_setting',
        entityId: corridor,
        action: 'update_spread',
        actorId: req.user.sub,
        actorRole: 'admin',
        payload: { corridor, spread },
        requestId: req.requestId
      }
    });

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

/**
 * PUT /api/v1/admin/currencies/:corridor/status — Toggle active status
 * Body: { isActive: boolean }
 */
router.put('/currencies/:corridor/status', async (req, res, next) => {
  try {
    const { corridor } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({ error: 'isActive boolean required' });
    }

    const result = await currencyService.toggleCurrencyStatus(corridor, isActive);

    // Audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'currency_setting',
        entityId: corridor,
        action: 'toggle_currency_status',
        actorId: req.user.sub,
        actorRole: 'admin',
        payload: { corridor, isActive },
        requestId: req.requestId
      }
    });

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

function sanitizeUser(user) {
  const { passwordHash, resetToken, resetTokenExpiresAt, loginAttempts, lockedUntil, ...safe } = user;
  return safe;
}

module.exports = router;
