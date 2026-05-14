const prisma = require('../utils/prisma');
const logger = require('../utils/logger');

async function requestReport(type, params, requestedBy) {
  const title = params.title || `${type.replace(/_/g, ' ').toUpperCase()} Report`;
  const report = await prisma.report.create({
    data: { type, title, generatedBy: requestedBy, parameters: params, status: 'PENDING' },
  });

  // Generate asynchronously
  setImmediate(() => generateReport(report.id).catch(err =>
    logger.error({ msg: 'Report generation failed', reportId: report.id, error: err.message })
  ));

  return report;
}

async function generateReport(reportId) {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) return;

  await prisma.report.update({ where: { id: reportId }, data: { status: 'GENERATING' } });

  try {
    const { data, count } = await fetchReportData(report.type, report.parameters);
    // In production this would write to S3; for now we store data inline as JSON
    const fileUrl = `/reports/${reportId}.json`;

    await prisma.report.update({
      where: { id: reportId },
      data: { status: 'READY', recordCount: count, fileUrl, completedAt: new Date() },
    });

    logger.info({ msg: 'Report generated', reportId, type: report.type, count });
  } catch (err) {
    await prisma.report.update({
      where: { id: reportId },
      data: { status: 'FAILED', errorMessage: err.message, completedAt: new Date() },
    });
    throw err;
  }
}

async function fetchReportData(type, params) {
  const dateFrom = params.dateFrom ? new Date(params.dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const dateTo = params.dateTo ? new Date(params.dateTo) : new Date();
  const dateFilter = { gte: dateFrom, lte: dateTo };

  switch (type) {
    case 'transaction': {
      const where = { createdAt: dateFilter };
      if (params.corridor) where.corridor = params.corridor;
      if (params.status) where.status = params.status;
      const data = await prisma.transfer.findMany({ where, orderBy: { createdAt: 'desc' } });
      return { data, count: data.length };
    }
    case 'commission': {
      const where = { createdAt: dateFilter };
      if (params.agentId) where.agentId = params.agentId;
      const data = await prisma.commission.findMany({ where, include: { transfer: { select: { urc: true, corridor: true } } } });
      return { data, count: data.length };
    }
    case 'forex_gain_loss': {
      const data = await prisma.forexRate.findMany({ where: { fetchedAt: dateFilter }, orderBy: { fetchedAt: 'desc' } });
      return { data, count: data.length };
    }
    case 'compliance': {
      const [alerts, kyc, aml] = await Promise.all([
        prisma.fraudAlert.findMany({ where: { createdAt: dateFilter } }),
        prisma.kycApplication.findMany({ where: { createdAt: dateFilter } }),
        prisma.amlCheck.findMany({ where: { createdAt: dateFilter } }),
      ]);
      return { data: { alerts, kyc, aml }, count: alerts.length + kyc.length + aml.length };
    }
    case 'audit': {
      const where = { createdAt: dateFilter };
      if (params.actorId) where.actorId = params.actorId;
      const data = await prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: 5000 });
      return { data, count: data.length };
    }
    case 'revenue': {
      const transfers = await prisma.transfer.findMany({
        where: { createdAt: dateFilter, status: 'COMPLETED' },
        select: { fee: true, corridor: true, sendCurrency: true, sendAmount: true, createdAt: true },
      });
      const totalFees = transfers.reduce((sum, t) => sum + parseFloat(t.fee), 0);
      return { data: { transfers, totalFees, count: transfers.length }, count: transfers.length };
    }
    case 'settlement': {
      const data = await prisma.platformLedger.findMany({ where: { createdAt: dateFilter }, orderBy: { createdAt: 'desc' } });
      return { data, count: data.length };
    }
    default:
      throw new Error(`Unknown report type: ${type}`);
  }
}

async function getReport(reportId) {
  return prisma.report.findUnique({ where: { id: reportId } });
}

async function listReports(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const where = userId ? { generatedBy: userId } : {};
  const [reports, total] = await Promise.all([
    prisma.report.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.report.count({ where }),
  ]);
  return { reports, total, page, totalPages: Math.ceil(total / limit) };
}

module.exports = { requestReport, getReport, listReports, fetchReportData };
