const { v4: uuidv4 } = require('uuid');
const KycProviderInterface = require('./interface');
const logger = require('../../utils/logger');

const APPLICANT_MAP = new Map();

class MockSumsubProvider extends KycProviderInterface {
  async submitDocument(userId, filePath, docType) {
    const applicantId = `SUMSUB-${uuidv4()}`;
    APPLICANT_MAP.set(applicantId, { status: 'init', userId, docType });
    logger.info({ msg: '[MockSumsub] Applicant created', applicantId, userId, docType });

    setTimeout(() => {
      const verified = Math.random() > 0.15;
      APPLICANT_MAP.set(applicantId, {
        status: 'completed',
        userId, docType, verified,
        reviewAnswer: verified ? 'GREEN' : 'RED',
        reviewRejectType: verified ? null : 'FINAL',
        reviewResult: {
          reviewAnswer: verified ? 'GREEN' : 'RED',
          clientComment: verified ? null : 'Document could not be verified',
          moderationComment: null,
        },
        confidence: verified ? parseFloat((0.90 + Math.random() * 0.09).toFixed(4)) : null,
        docData: verified ? {
          firstName: 'Mock',
          lastName: 'User',
          dob: '1990-06-20',
          number: `PAS${Math.floor(Math.random() * 1e8)}`,
          country: 'RWA',
          validUntil: '2029-01-01',
        } : null,
      });
    }, 2000);

    return { jobId: applicantId, applicantId, status: 'PENDING', provider: 'sumsub' };
  }

  async getStatus(applicantId) {
    const a = APPLICANT_MAP.get(applicantId);
    if (!a) return { applicantId, status: 'NOT_FOUND' };
    return { applicantId, status: a.status === 'completed' ? 'COMPLETED' : 'PENDING', provider: 'sumsub' };
  }

  async getResult(applicantId) {
    const a = APPLICANT_MAP.get(applicantId);
    if (!a || a.status !== 'completed') return null;
    return {
      jobId: applicantId,
      applicantId,
      status: 'COMPLETED',
      provider: 'sumsub',
      verified: a.verified,
      confidence: a.confidence,
      data: a.docData,
      reason: a.verified ? null : a.reviewResult?.clientComment,
      reviewAnswer: a.reviewAnswer,
    };
  }
}

module.exports = MockSumsubProvider;
