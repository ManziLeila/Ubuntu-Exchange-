const { v4: uuidv4 } = require('uuid');
const PaymentProviderInterface = require('./interface');
const logger = require('../../utils/logger');

const STATUS_MAP = new Map();
const FAILURE_RATE = 0.05; // 5% simulated failure

class MockMomoProvider extends PaymentProviderInterface {
  constructor(callbackBaseUrl) {
    super();
    this.callbackBaseUrl = callbackBaseUrl || process.env.CORE_INTERNAL_URL || 'http://localhost:3001';
  }

  async requestCollection({ urc, amount, currency, msisdn, country }) {
    const ref = `MOMO_COLL_${uuidv4().replace(/-/g, '').slice(0, 16).toUpperCase()}`;
    STATUS_MAP.set(ref, 'PENDING');
    logger.info({ msg: '[MockMoMo] Collection initiated', ref, urc, amount, currency });

    const willFail = Math.random() < FAILURE_RATE;
    setTimeout(async () => {
      try {
        const status = willFail ? 'FAILED' : 'SUCCESSFUL';
        STATUS_MAP.set(ref, status);
        const axios = require('axios');
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ service: 'momo' }, process.env.SERVICE_JWT_SECRET, { expiresIn: '5m' });
        await axios.post(`${this.callbackBaseUrl}/webhooks/payment/momo-collection`, {
          urc, ref, status, provider: 'mtn_momo', country,
        }, { headers: { 'x-service-token': token }, timeout: 5000 });
      } catch (e) {
        logger.error({ msg: '[MockMoMo] Callback failed', error: e.message });
      }
    }, 2000);

    return { ref, status: 'PENDING', provider: 'mtn_momo' };
  }

  async requestDisbursement({ urc, amount, currency, msisdn, recipientName, country }) {
    const ref = `MOMO_PAY_${uuidv4().replace(/-/g, '').slice(0, 16).toUpperCase()}`;
    STATUS_MAP.set(ref, 'PENDING');
    logger.info({ msg: '[MockMoMo] Disbursement initiated', ref, urc, amount, currency });

    const willFail = Math.random() < 0.03;
    setTimeout(async () => {
      try {
        const status = willFail ? 'FAILED' : 'SUCCESSFUL';
        STATUS_MAP.set(ref, status);
        const axios = require('axios');
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ service: 'momo' }, process.env.SERVICE_JWT_SECRET, { expiresIn: '5m' });
        await axios.post(`${this.callbackBaseUrl}/webhooks/payment/momo-payout`, {
          urc, ref, status, provider: 'mtn_momo', country,
        }, { headers: { 'x-service-token': token }, timeout: 5000 });
      } catch (e) {
        logger.error({ msg: '[MockMoMo] Payout callback failed', error: e.message });
      }
    }, 3000);

    return { ref, status: 'PENDING', provider: 'mtn_momo' };
  }

  async checkStatus(ref) {
    return { ref, status: STATUS_MAP.get(ref) || 'UNKNOWN' };
  }

  async cancelPayment(ref) {
    STATUS_MAP.set(ref, 'CANCELLED');
    return { ref, status: 'CANCELLED' };
  }
}

module.exports = MockMomoProvider;
