const express = require('express');
const router = express.Router();
const { authenticate, authorize, ROLES } = require('../middleware/auth');
const { kycUpload } = require('../middleware/upload');
const kycService = require('../services/kycService');
const { validate } = require('../middleware/common');
const { kycReviewSchema } = require('../middleware/validate');
const path = require('path');

// Client: submit KYC documents
router.post('/documents', authenticate, kycUpload.fields([
  { name: 'national_id', maxCount: 1 },
  { name: 'passport', maxCount: 1 },
  { name: 'selfie', maxCount: 1 },
  { name: 'utility_bill', maxCount: 1 },
]), async (req, res, next) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    const files = Object.entries(req.files).flatMap(([fieldname, arr]) =>
      arr.map(f => ({ ...f, fieldname }))
    );
    const result = await kycService.submitDocuments(req.user.id, files);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

// Client: submit ID details (text-based, no file upload)
router.post('/submit-id', authenticate, async (req, res, next) => {
  try {
    const { idType, idNumber, expiryDate } = req.body;
    if (!idType || !idNumber) return res.status(400).json({ error: 'idType and idNumber are required' });
    const result = await kycService.submitIdDetails(req.user.id, { idType, idNumber, expiryDate });
    res.status(201).json(result);
  } catch (err) { next(err); }
});

// Client: get own KYC status
router.get('/status', authenticate, async (req, res, next) => {
  try {
    const result = await kycService.getApplicationForUser(req.user.id);
    res.json({ data: result.application });
  } catch (err) { next(err); }
});

// Client: list own KYC documents
router.get('/documents', authenticate, async (req, res, next) => {
  try {
    const { prisma } = require('../utils/prisma');
    const docs = await prisma.kycDocument.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ documents: docs });
  } catch (err) { next(err); }
});

// Admin/Compliance: list all applications
router.get('/admin/applications', authenticate, authorize(ROLES.ADMIN), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const result = await kycService.getAllApplications({ status }, page, limit);
    res.json(result);
  } catch (err) { next(err); }
});

// Admin/Compliance: get single application with documents
router.get('/admin/applications/:id', authenticate, authorize(ROLES.ADMIN), async (req, res, next) => {
  try {
    const prisma = require('../utils/prisma');
    const app = await prisma.kycApplication.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true, email: true, country: true, msisdn: true, createdAt: true } },
      },
    });
    if (!app) return res.status(404).json({ error: 'Application not found' });
    const docs = await prisma.kycDocument.findMany({ where: { userId: app.userId } });
    res.json({ application: app, documents: docs });
  } catch (err) { next(err); }
});

// Admin/Compliance: review (approve/reject/request-docs)
router.post('/admin/applications/:id/review', authenticate, authorize(ROLES.ADMIN), async (req, res, next) => {
  try {
    const parsed = kycReviewSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    const { decision, reviewNotes, rejectionReason } = parsed.data;
    const result = await kycService.reviewApplication(req.params.id, req.user.id, decision, reviewNotes, rejectionReason);
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
