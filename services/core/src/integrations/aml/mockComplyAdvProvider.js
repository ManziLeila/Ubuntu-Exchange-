const { v4: uuidv4 } = require('uuid');
const AmlProviderInterface = require('./interface');
const logger = require('../../utils/logger');

const HIGH_RISK_COUNTRIES = ['KP', 'IR', 'SY', 'MM', 'BY'];
const SANCTION_LIST_SAMPLE = ['John Doe Sanctioned', 'Jane Smith Blocked', 'ACME Shell Corp'];

class MockComplyAdvProvider extends AmlProviderInterface {
  async screenUser(userId, userData) {
    const checkId = `CAD_${uuidv4().slice(0, 10).toUpperCase()}`;
    logger.info({ msg: '[MockComplyAdv] User screening', checkId, userId });

    const isFlagged = Math.random() < 0.10; // 10% flagged
    const riskScore = isFlagged ? Math.floor(60 + Math.random() * 40) : Math.floor(Math.random() * 40);

    return {
      checkId,
      provider: 'comply_advantage',
      status: isFlagged ? 'FLAGGED' : 'CLEAR',
      riskScore,
      matches: isFlagged ? [{
        matchType: Math.random() > 0.5 ? 'SANCTIONS' : 'PEP',
        name: SANCTION_LIST_SAMPLE[Math.floor(Math.random() * SANCTION_LIST_SAMPLE.length)],
        score: parseFloat((0.7 + Math.random() * 0.3).toFixed(2)),
        source: 'OFAC',
        matchId: uuidv4(),
      }] : [],
      checkedAt: new Date().toISOString(),
    };
  }

  async screenTransaction(transferId, txData) {
    const checkId = `CAD_TX_${uuidv4().slice(0, 10).toUpperCase()}`;
    logger.info({ msg: '[MockComplyAdv] Transaction screening', checkId, transferId });

    const isHighRisk = HIGH_RISK_COUNTRIES.some(c => txData.recipientCountry?.includes(c));
    const isLarge = parseFloat(txData.amount) > 5000000;
    const isFlagged = isHighRisk || isLarge || Math.random() < 0.05;
    const riskScore = isFlagged ? Math.floor(70 + Math.random() * 30) : Math.floor(Math.random() * 30);

    return {
      checkId,
      provider: 'comply_advantage',
      status: isFlagged ? 'REVIEW' : 'CLEAR',
      riskScore,
      riskFactors: [
        ...(isHighRisk ? ['HIGH_RISK_COUNTRY'] : []),
        ...(isLarge ? ['LARGE_TRANSACTION'] : []),
      ],
      checkedAt: new Date().toISOString(),
    };
  }

  async getReport(checkId) {
    return {
      checkId,
      provider: 'comply_advantage',
      status: 'COMPLETED',
      reportUrl: null, // would be S3 URL in production
      generatedAt: new Date().toISOString(),
    };
  }
}

module.exports = MockComplyAdvProvider;
