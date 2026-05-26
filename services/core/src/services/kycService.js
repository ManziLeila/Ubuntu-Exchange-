const path = require('path');
const prisma = require('../utils/prisma');
const logger = require('../utils/logger');
const { getKycProvider } = require('../integrations');
const notificationService = require('./notificationService');
const Bull = require('bull');
const fs = require('fs/promises');

const ADMIN_KYC_EMAIL = process.env.KYC_ADMIN_EMAIL || 'ubuntuexchange7@gmail.com';
const notifQueue = new Bull('notifications', process.env.REDIS_URL, {
  redis: { enableOfflineQueue: false, maxRetriesPerRequest: null, retryStrategy: (n) => Math.min(n * 5000, 60000) }
});
notifQueue.on('error', () => {});

function buildAdminReviewUrl(applicationId) {
  const base = process.env.FRONTEND_URL || '';
  const path = applicationId ? `/admin/kyc/${applicationId}` : '/admin/kyc';
  return `${base}${path}`;
}

async function notifyAdminsOfKycSubmission(applicationId, user, meta = {}) {
  const admins = await prisma.user.findMany({
    where: { role: 'admin', status: { not: 'suspended' } },
    select: { id: true },
  });
  const applicantName = user?.name || `${meta.firstName || ''} ${meta.lastName || ''}`.trim() || 'Client';
  const actionUrl = buildAdminReviewUrl(applicationId);

  await Promise.all(admins.map((admin) =>
    notificationService.createInApp(
      admin.id,
      'kyc_review',
      'New KYC application submitted',
      `${applicantName} submitted KYC documents and is waiting for review.`,
      { applicationId, userId: user?.id, actionUrl },
    )
  ));

  const io = global.io;
  if (io) {
    io.to('admin_room').emit('kyc:updated', {
      applicationId,
      userId: user?.id,
      status: 'UNDER_REVIEW',
      actionUrl,
    });
  }
}

async function getOrCreateApplication(userId) {
  let app = await prisma.kycApplication.findUnique({ where: { userId } });
  if (!app) {
    app = await prisma.kycApplication.create({ data: { userId } });
  }
  return app;
}

async function submitDocuments(userId, files, meta = {}) {
  const app = await getOrCreateApplication(userId);
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (app.status === 'APPROVED') {
    throw Object.assign(new Error('KYC is already approved'), { statusCode: 409 });
  }

  const provider = getKycProvider();
  const docRecords = [];

  for (const file of files) {
    const docType = file.fieldname || 'national_id'; // multer field name = doc type
    const relativePath = `/uploads/kyc/${userId}/${path.basename(file.path)}`;

    const ocrData = {
      ...(await simulateOcr(docType, file.path)),
      submitted: {
        country: meta.country || null,
        documentType: meta.documentType || docType,
        idNumber: meta.idNumber || null,
        firstName: meta.firstName || null,
        lastName: meta.lastName || null,
        dateOfBirth: meta.dateOfBirth || null,
      }
    };

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
        const current = await prisma.kycDocument.findUnique({ where: { id: doc.id } });
        const currentOcr = current?.ocrData && typeof current.ocrData === 'object' ? current.ocrData : {};
        const updates = {
          ocrData: {
            ...currentOcr,
            providerCheck: {
              status: result.verified ? 'PASSED' : 'NEEDS_REVIEW',
              confidence: result.confidence || null,
              reason: result.reason || null,
              data: result.data || null,
            },
          },
        };
        if (docType === 'selfie' && result.confidence) {
          updates.faceMatchScore = result.confidence;
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

  await prisma.user.update({ where: { id: userId }, data: { country: meta.country || user?.country || null } }).catch(() => null);

  await notifQueue.add('send_email', {
    template: 'kyc_submitted_admin',
    to: ADMIN_KYC_EMAIL,
    data: {
      name: user?.name || `${meta.firstName || ''} ${meta.lastName || ''}`.trim() || 'Client',
      email: user?.email,
      country: meta.country,
      documentType: meta.documentType,
      idNumber: meta.idNumber,
      reviewUrl: buildAdminReviewUrl(app.id),
    },
    idempotency_key: `kyc-admin-${userId}-${Date.now()}`
  }).catch(() => null);

  await notifQueue.add('send_email', {
    template: 'kyc_submitted_client',
    to: user?.email,
    data: { name: user?.name || meta.firstName || 'Client' },
    idempotency_key: `kyc-client-submitted-${userId}-${Date.now()}`
  }).catch(() => null);

  await notifyAdminsOfKycSubmission(app.id, user, meta);

  await notificationService.createInApp(userId, 'kyc_update', 'KYC Documents Submitted',
    'Your KYC documents have been received and are under review. You will be notified of the outcome within 24 hours.', null);

  logger.info({ msg: 'KYC documents submitted', userId, count: docRecords.length });
  return { application: await prisma.kycApplication.findUnique({ where: { id: app.id } }), documents: docRecords };
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


async function deleteUploadedKycFiles(userId) {
  const docs = await prisma.kycDocument.findMany({ where: { userId } });
  for (const doc of docs) {
    if (!doc.fileUrl || doc.fileUrl.startsWith('text://')) continue;
    const uploadRoot = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');
    const relative = doc.fileUrl.replace(/^\/uploads\//, '');
    const fullPath = path.join(uploadRoot, relative);
    await fs.unlink(fullPath).catch(() => null);
    await prisma.kycDocument.update({
      where: { id: doc.id },
      data: { fileUrl: `verified://removed/${doc.id}`, fileName: 'removed-after-review' }
    }).catch(() => null);
  }
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

  if (decision === 'APPROVED' || decision === 'REJECTED') {
    await deleteUploadedKycFiles(app.userId);
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
    await notifQueue.add('send_email', {
      template: decision === 'APPROVED' ? 'kyc_approved_client' : 'kyc_rejected_client',
      to: updated.user.email,
      data: { name: updated.user.name, reason: rejectionReason || notes || 'Please submit a clearer document photo.' },
      idempotency_key: `kyc-${decision.toLowerCase()}-${app.userId}-${Date.now()}`
    }).catch(() => null);
  }

  const io = global.io;
  if (io) io.to('admin_room').emit('kyc:updated', { userId: app.userId, status: decision });

  logger.info({ msg: 'KYC application reviewed', applicationId, decision, reviewerId });
  return updated;
}

async function deleteApplication(applicationId, adminId) {
  const app = await prisma.kycApplication.findUnique({
    where: { id: applicationId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!app) throw Object.assign(new Error('KYC application not found'), { statusCode: 404 });

  await deleteUploadedKycFiles(app.userId);
  await prisma.kycDocument.deleteMany({ where: { userId: app.userId } });
  await prisma.kycApplication.delete({ where: { id: applicationId } });

  await prisma.auditLog.create({
    data: {
      entityType: 'kyc',
      entityId: applicationId,
      action: 'delete',
      actorId: adminId,
      actorRole: 'admin',
      payload: { userId: app.userId, userEmail: app.user?.email, previousStatus: app.status },
    },
  }).catch(() => null);

  const io = global.io;
  if (io) io.to('admin_room').emit('kyc:deleted', { applicationId, userId: app.userId });

  logger.info({ msg: 'KYC application deleted', applicationId, adminId });
  return { deleted: true, applicationId };
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

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const updatedApp = await prisma.kycApplication.findUnique({ where: { id: app.id } });
  await notifyAdminsOfKycSubmission(updatedApp.id, user, { idType, idNumber });

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
  deleteApplication,
};
