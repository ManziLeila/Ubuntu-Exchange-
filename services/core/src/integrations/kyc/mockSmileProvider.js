const { v4: uuidv4 } = require('uuid');
const KycProviderInterface = require('./interface');
const logger = require('../../utils/logger');

const JOB_MAP = new Map();

class MockSmileProvider extends KycProviderInterface {
  async submitDocument(userId, filePath, docType) {
    const jobId = `SMILE_${uuidv4().slice(0, 8).toUpperCase()}`;
    JOB_MAP.set(jobId, { status: 'PENDING', userId, docType });
    logger.info({ msg: '[MockSmile] Document submitted', jobId, userId, docType });

    // Simulate async processing (2s)
    setTimeout(() => {
      const verified = Math.random() > 0.15; // 85% pass rate
      const confidence = verified ? (0.88 + Math.random() * 0.10) : (0.30 + Math.random() * 0.30);
      JOB_MAP.set(jobId, {
        status: 'COMPLETED',
        userId, docType,
        verified,
        confidence: parseFloat(confidence.toFixed(4)),
        data: verified ? {
          full_name: 'Mock User Name',
          date_of_birth: '1990-01-15',
          document_number: `ID${Math.floor(Math.random() * 1e8).toString().padStart(8, '0')}`,
          expiry_date: '2028-12-31',
          nationality: 'RW',
        } : null,
        reason: verified ? null : 'Document image is blurry or incomplete',
      });
    }, 2000);

    return { jobId, status: 'PENDING', provider: 'smile_identity' };
  }

  async getStatus(jobId) {
    const job = JOB_MAP.get(jobId);
    if (!job) return { jobId, status: 'NOT_FOUND' };
    return { jobId, status: job.status, provider: 'smile_identity' };
  }

  async getResult(jobId) {
    const job = JOB_MAP.get(jobId);
    if (!job) return null;
    if (job.status !== 'COMPLETED') return { jobId, status: job.status };
    return {
      jobId,
      status: 'COMPLETED',
      provider: 'smile_identity',
      verified: job.verified,
      confidence: job.confidence,
      data: job.data,
      reason: job.reason,
    };
  }
}

module.exports = MockSmileProvider;
