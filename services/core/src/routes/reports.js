const express = require('express');
const router = express.Router();
const { authenticate, authorize, ROLES } = require('../middleware/auth');
const reportService = require('../services/reportService');
const { reportRequestSchema } = require('../middleware/validate');

const STAFF = [ROLES.ADMIN];

router.post('/request', authenticate, authorize(...STAFF), async (req, res, next) => {
  try {
    const parsed = reportRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    const report = await reportService.requestReport(parsed.data.type, parsed.data, req.user.id);
    res.status(202).json({ report, message: 'Report generation queued' });
  } catch (err) { next(err); }
});

router.get('/', authenticate, authorize(...STAFF), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await reportService.listReports(
      req.user.id,
      page, limit
    );
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/:id', authenticate, authorize(...STAFF), async (req, res, next) => {
  try {
    const report = await reportService.getReport(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json(report);
  } catch (err) { next(err); }
});

router.get('/:id/download', authenticate, authorize(...STAFF), async (req, res, next) => {
  try {
    const report = await reportService.getReport(req.params.id);
    if (!report || report.status !== 'READY') return res.status(404).json({ error: 'Report not ready' });
    const { fetchReportData } = require('../services/reportService');
    const { data } = await fetchReportData(report.type, report.parameters);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="report-${report.id}.json"`);
    res.json(data);
  } catch (err) { next(err); }
});

module.exports = router;
