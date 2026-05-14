const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Middleware: verify end-user JWT (Authorization: Bearer <token>)
 */
function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { ...payload, id: payload.sub }; // normalise: id === sub
    next();
  } catch (err) {
    logger.warn({ msg: 'JWT verification failed', error: err.message });
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Middleware factory: restrict to specific roles
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

/**
 * Middleware: verify internal service-to-service JWT
 */
function authenticateService(req, res, next) {
  try {
    const header = req.headers['x-service-token'];
    if (!header) {
      return res.status(401).json({ error: 'Missing service token' });
    }
    const payload = jwt.verify(header, process.env.SERVICE_JWT_SECRET);
    req.service = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid service token' });
  }
}

const ROLES = {
  CLIENT: 'client',
  AGENT: 'agent',
  ADMIN: 'admin',
};

/**
 * Middleware: require approved KYC before allowing sensitive operations.
 * Reads from a Redis cache key `kyc:approved:{userId}` set at KYC approval.
 * Skips check in development if KYC_REQUIRED=false env var is set.
 */
function requireKyc(req, res, next) {
  if (process.env.KYC_REQUIRED === 'false') return next();
  if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
  if (req.user.role !== ROLES.CLIENT) return next();
  const redis = req.app.locals.redis;
  if (!redis) return next();
  redis.get(`kyc:approved:${req.user.id}`).then(val => {
    if (!val) return res.status(403).json({ error: 'KYC verification required before sending money', code: 'KYC_REQUIRED' });
    next();
  }).catch(() => next()); // fail open — KYC check is best-effort
}

module.exports = { authenticate, authorize, authenticateService, ROLES, requireKyc };
