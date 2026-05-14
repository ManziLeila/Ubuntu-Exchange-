const logger = require('../utils/logger');

/**
 * Pre-transfer fraud check middleware.
 * Attaches req.fraudScore = { score, level, flags } to request.
 * CRITICAL score blocks the transfer; HIGH flags it but allows through.
 */
async function fraudCheck(req, res, next) {
  try {
    const fraudService = require('../services/fraudService');
    const { sendAmount, sendCurrency, recipientCountry } = req.body;
    const corridor = req.body.corridor || `${sendCurrency}_${req.body.recvCurrency}`;
    const result = await fraudService.runPreChecks(
      req.user.id,
      parseFloat(sendAmount) || 0,
      corridor,
      req.ip,
      req.headers['x-device-id'],
    );
    req.fraudScore = result;
    if (result.level === 'CRITICAL') {
      logger.warn({ msg: 'Transfer blocked by fraud engine', userId: req.user.id, flags: result.flags });
      return res.status(422).json({ error: 'Transfer blocked due to risk assessment', code: 'FRAUD_BLOCKED', flags: result.flags });
    }
    next();
  } catch (err) {
    // Fail open — fraud check is best-effort; don't block legitimate transfers on errors
    logger.error({ msg: 'Fraud check error (fail-open)', error: err.message });
    req.fraudScore = { score: 0, level: 'LOW', flags: [] };
    next();
  }
}

module.exports = { fraudCheck };
