const path = require('path');
const prisma = require('../utils/prisma');
const logger = require('../utils/logger');
const { getKycProvider } = require('../integrations');
const notificationService = require('./notificationService');

async function getOrCreateApplication(userId) {
  let app = await prisma.kycApplication.findUnique({ where: { userId } });
  if (!app) {
    app = await prisma.kycApplication.create({ data: { userId } });
  }
  return app;
}

async function submitDocuments(userId, files) {
  const app = await getOrCreateApplication(userId);

  if (app.status === 'APPROVED') {
    throw Object.assign(new Error('KYC is already approved'), { statusCode: 409 });
  }

  const provider = getKycProvider();
  const docRecords = [];

  for (const file of files) {
    const docType = file.fieldname || 'national_id'; // multer field name = doc type
    const relativePath = `/uploads/kyc/${userId}/${path.basename(file.path)}`;

    // Simulate OCR extraction
    const ocrData = await simulateOcr(docType, file.path);

    // Submit to mock KYC provider
    const jobResult = await provider.submitDocument(userId, file.path, docType);

    const doc = await prisma.kycDocument.create({
      data: {
        userId,
        type: docType,
        fileUrl: relativePath,
        fileName: file.originalname,
        mimeType: file.mimetype,
        status: 'PENDING',
        ocrData,
      },
    });

    docRecords.push(doc);

    // After 2s, poll for KYC result and update document
    setTimeout(async () => {
      try {
        const result = await provider.getResult(jobResult.jobId);
        if (!result || result.status !== 'COMPLETED') return;
        const updates = { status: result.verified ? 'APPROVED' : 'REJECTED' };
        if (docType === 'selfie' && result.verified) {
          updates.faceMatchScore = result.confidence || 0.95;
        }
        if (result.data && updates.ocrData === undefined) {
          // Merge OCR data
        }
        await prisma.kycDocument.update({ where: { id: doc.id }, data: updates });
      } catch (e) {
        logger.warn({ msg: 'KYC result poll failed', docId: doc.id, error: e.message });
      }
    }, 2500);
  }

  // Update application status to UNDER_REVIEW
  await prisma.kycApplication.update({
    where: { id: app.id },
    data: { status: 'UNDER_REVIEW', submittedAt: new Date() },
  });

  // Notify admin room
  const io = global.io;
  if (io) io.to('admin_room').emit('kyc:updated', { userId, status: 'UNDER_REVIEW' });

  await notificationService.createInApp(userId, 'kyc_update', 'KYC Documents Submitted',
    'Your KYC documents have been received and are under review. You will be notified of the outcome within 24 hours.', null);

  logger.info({ msg: 'KYC documents submitted', userId, count: docRecords.length });
  return { application: app, documents: docRecords };
}

async function simulateOcr(docType, filePath) {
  await new Promise(r => setTimeout(r, 200)); // simulate processing delay
  if (docType === 'selfie') return { type: 'selfie', faceDetected: true, quality: 'HIGH' };
  return {
    type: docType,
    extracted: {
      full_name: 'Mock User Name',
      date_of_birth: '1990-01-15',
      document_number: `DOC${Math.floor(Math.random() * 1e8).toString().padStart(8, '0')}`,
      expiry_date: '2028-12-31',
      nationality: 'RW',
    },
    confidence: parseFloat((0.88 + Math.random() * 0.10).toFixed(4)),
    warnings: [],
  };
}

async function getApplicationForUser(userId) {
  const [app, docs] = await Promise.all([
    prisma.kycApplication.findUnique({ where: { userId } }),
    prisma.kycDocument.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
  ]);
  return { application: app, documents: docs };
}

async function reviewApplication(applicationId, reviewerId, decision, notes, rejectionReason) {
  const app = await prisma.kycApplication.findUnique({ where: { id: applicationId } });
  if (!app) throw Object.assign(new Error('KYC application not found'), { statusCode: 404 });

  const updated = await prisma.kycApplication.update({
    where: { id: applicationId },
    data: {
      status: decision,
      reviewedAt: new Date(),
      reviewedBy: reviewerId,
      reviewNotes: notes,
      rejectionReason: decision === 'REJECTED' ? rejectionReason : null,
    },
    include: { user: true },
  });

  // Cache approval in Redis for requireKyc middleware
  if (decision === 'APPROVED') {
    try {
      const redis = require('../utils/prisma').redis || global.redis;
      if (redis) await redis.set(`kyc:approved:${app.userId}`, '1', 'EX', 60 * 60 * 24 * 365);
    } catch (e) { /* non-critical */ }
  }

  // Notify user
  const msgs = {
    APPROVED: { title: 'KYC Approved!', body: 'Your identity has been verified. You can now send money.' },
    REJECTED: { title: 'KYC Rejected', body: `Your KYC was rejected. Reason: ${rejectionReason || 'See details'}. Please resubmit.` },
    REQUIRES_DOCS: { title: 'Additional Documents Required', body: notes || 'Please upload additional supporting documents.' },
  };
  const msg = msgs[decision];
  if (msg) {
    await notificationService.createInApp(app.userId, 'kyc_update', msg.title, msg.body, { decision });
  }

  const io = global.io;
  if (io) io.to('admin_room').emit('kyc:updated', { userId: app.userId, status: decision });

  logger.info({ msg: 'KYC application reviewed', applicationId, decision, reviewerId });
  return updated;
}

async function getPendingApplications(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const where = { status: { in: ['UNDER_REVIEW', 'PENDING'] } };
  const [items, total] = await Promise.all([
    prisma.kycApplication.findMany({
      where, skip, take: limit,
      orderBy: { submittedAt: 'asc' },
      include: {
        user: { select: { id: true, name: true, email: true, country: true, createdAt: true } },
      },
    }),
    prisma.kycApplication.count({ where }),
  ]);
  return { items, total, page, totalPages: Math.ceil(total / limit) };
}

async function getAllApplications(filters = {}, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const where = {};
  if (filters.status) where.status = filters.status;
  const [items, total] = await Promise.all([
    prisma.kycApplication.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, country: true, createdAt: true } },
      },
    }),
    prisma.kycApplication.count({ where }),
  ]);
  return { items, total, page, totalPages: Math.ceil(total / limit) };
}

async function submitIdDetails(userId, { idType, idNumber, expiryDate }) {
  const app = await getOrCreateApplication(userId);

  if (app.status === 'APPROVED') {
    throw Object.assign(new Error('KYC is already approved'), { statusCode: 409 });
  }

  // Store ID details as a KycDocument record (no file — text-based submission)
  await prisma.kycDocument.create({
    data: {
      userId,
      type: idType,
      fileUrl: `text://id-submission/${userId}`,
      fileName: `${idType.replace(/_/g, '-')}-${idNumber.slice(-4)}`,
      mimeType: 'application/json',
      status: 'PENDING',
      ocrData: { idNumber, expiryDate: expiryDate || null, submittedVia: 'id_entry' },
    },
  });

  await prisma.kycApplication.update({
    where: { id: app.id },
    data: { status: 'UNDER_REVIEW', submittedAt: new Date() },
  });

  const io = global.io;
  if (io) io.to('admin_room').emit('kyc:updated', { userId, status: 'UNDER_REVIEW' });

  await notificationService.createInApp(userId, 'kyc_update', 'KYC Details Submitted',
    'Your ID details are under review. You will be notified within 24 hours.', null);

  logger.info({ msg: 'KYC ID details submitted', userId, idType });
  return { status: 'UNDER_REVIEW' };
}

module.exports = {
  submitDocuments,
  submitIdDetails,
  getApplicationForUser,
  reviewApplication,
  getPendingApplications,
  getAllApplications,
  getOrCreateApplication,
};
