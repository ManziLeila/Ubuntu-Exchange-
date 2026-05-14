require('dotenv').config();
const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const { requestId, httpLogger, errorHandler } = require('./middleware/common');
const authRoutes = require('./routes/auth');
const transferRoutes = require('./routes/transfers');
const adminRoutes = require('./routes/admin');
const forexRoutes = require('./routes/forex');
const kycRoutes = require('./routes/kyc');
const beneficiaryRoutes = require('./routes/beneficiaries');
const otpRoutes = require('./routes/otp');
const notifRoutes = require('./routes/notifications');
const fraudRoutes = require('./routes/fraud');
const reportRoutes = require('./routes/reports');
const agentRoutes = require('./routes/agent');
const superAdminRoutes = require('./routes/superadmin');
const webhookRoutes = require('./routes/webhooks');
const prisma = require('./utils/prisma');
const logger = require('./utils/logger');
const { getCorsOriginOption } = require('./utils/corsConfig');
const { initSocket } = require('./utils/socket');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../uploads');

// ── Socket.io ─────────────────────────────────────────────────────────────────
if (process.env.SOCKET_ENABLED !== 'false') {
  initSocket(server);
}

// ── Security & parsing ────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false })); // CSP disabled for Swagger UI
app.use(cors({
  origin: getCorsOriginOption(),
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Request tracking ──────────────────────────────────────────────────────────
app.use(requestId);
app.use(httpLogger);

// ── Static uploads (KYC docs) ────────────────────────────────────────────────
const { authenticate } = require('./middleware/auth');
app.use('/uploads', authenticate, express.static(UPLOADS_DIR));

// ── Health checks ─────────────────────────────────────────────────────────────
app.get('/healthz', (req, res) => res.json({ status: 'ok', service: 'core', version: '2.0.0' }));
app.get('/readyz', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', db: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'not ready', db: 'disconnected', error: err.message });
  }
});

// ── Swagger UI ────────────────────────────────────────────────────────────────
if (process.env.SWAGGER_ENABLED !== 'false') {
  try {
    const swaggerUi = require('swagger-ui-express');
    const YAML = require('yamljs');
    const swaggerDoc = YAML.load(path.join(__dirname, 'swagger/swagger.yaml'));
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc, { customSiteTitle: 'GlobalTransact API' }));
    logger.info({ msg: 'Swagger UI available at /api/docs' });
  } catch (err) {
    logger.warn({ msg: 'Swagger UI not loaded', error: err.message });
  }
}

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/transfers', transferRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/forex', forexRoutes);
app.use('/api/v1/kyc', kycRoutes);
app.use('/api/v1/beneficiaries', beneficiaryRoutes);
app.use('/api/v1/otp', otpRoutes);
app.use('/api/v1/notifications', notifRoutes);
app.use('/api/v1/fraud', fraudRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/agent', agentRoutes);
app.use('/api/v1/super', superAdminRoutes);

// ── Webhook callbacks (authenticated by service JWT) ─────────────────────────
app.use('/webhooks', webhookRoutes);

// ── Legacy internal route (keep for backwards compat with forex service) ──────
app.use('/internal/v1', forexRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  logger.info({ msg: 'Core service v2.0 started', port: PORT, env: process.env.NODE_ENV });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received — shutting down');
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = app;
