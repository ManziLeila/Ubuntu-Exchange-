const { v4: uuidv4 } = require('uuid');
const PaymentProviderInterface = require('./interface');
const logger = require('../../utils/logger');

const STATUS_MAP = new Map();

class MockAirtelProvider extends PaymentProviderInterface {
  constructor(callbackBaseUrl) {
    super();
    this.callbackBaseUrl = callbackBaseUrl || process.env.CORE_INTERNAL_URL || 'http://localhost:3001';
  }

  async requestCollection({ urc, amount, currency, msisdn, country }) {
    const ref = `AIRTEL_COLL_${uuidv4().replace(/-/g, '').slice(0, 14).toUpperCase()}`;
    STATUS_MAP.set(ref, 'TS');
    logger.info({ msg: '[MockAirtel] Collection initiated', ref, urc, amount });

    const willFail = Math.random() < 0.05;
    setTimeout(async () => {
      try {
        const status = willFail ? 'TF' : 'TS'; // Airtel: TS=success, TF=failure
        STATUS_MAP.set(ref, status);
        const axios = require('axios');
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ service: 'momo' }, process.env.SERVICE_JWT_SECRET, { expiresIn: '5m' });
        await axios.post(`${this.callbackBaseUrl}/webhooks/payment/momo-collection`, {
          urc, ref, status: status === 'TS' ? 'SUCCESSFUL' : 'FAILED',
          provider: 'airtel_money', country,
        }, { headers: { 'x-service-token': token }, timeout: 5000 });
      } catch (e) {
        logger.error({ msg: '[MockAirtel] Callback failed', error: e.message });
      }
    }, 2500);

    return { ref, status: 'PENDING', provider: 'airtel_money', transactionId: ref };
  }

  async requestDisbursement({ urc, amount, currency, msisdn, recipientName, country }) {
    const ref = `AIRTEL_PAY_${uuidv4().replace(/-/g, '').slice(0, 14).toUpperCase()}`;
    STATUS_MAP.set(ref, 'TS');
    logger.info({ msg: '[MockAirtel] Disbursement initiated', ref, urc });

    setTimeout(async () => {
      try {
        const axios = require('axios');
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ service: 'momo' }, process.env.SERVICE_JWT_SECRET, { expiresIn: '5m' });
        await axios.post(`${this.callbackBaseUrl}/webhooks/payment/momo-payout`, {
          urc, ref, status: 'SUCCESSFUL', provider: 'airtel_money', country,
        }, { headers: { 'x-service-token': token }, timeout: 5000 });
      } catch (e) {
        logger.error({ msg: '[MockAirtel] Payout callback failed', error: e.message });
      }
    }, 3500);

    return { ref, status: 'PENDING', provider: 'airtel_money' };
  }

  async checkStatus(ref) {
    return { ref, status: STATUS_MAP.get(ref) || 'UNKNOWN', provider: 'airtel_money' };
  }

  async cancelPayment(ref) {
    STATUS_MAP.set(ref, 'TF');
    return { ref, status: 'CANCELLED' };
  }
}

module.exports = MockAirtelProvider;
