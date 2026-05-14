const { v4: uuidv4 } = require('uuid');
const PaymentProviderInterface = require('./interface');
const logger = require('../../utils/logger');

const STATUS_MAP = new Map();

class MockWiseProvider extends PaymentProviderInterface {
  constructor(callbackBaseUrl) {
    super();
    this.callbackBaseUrl = callbackBaseUrl || process.env.CORE_INTERNAL_URL || 'http://localhost:3001';
  }

  async requestCollection({ urc, amount, currency, accountNumber, country }) {
    const quoteId = `WISE_Q_${uuidv4().slice(0, 8).toUpperCase()}`;
    const ref = `WISE_T_${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
    STATUS_MAP.set(ref, 'incoming_payment_waiting');
    logger.info({ msg: '[MockWise] Collection initiated', ref, quoteId, urc });

    setTimeout(async () => {
      try {
        STATUS_MAP.set(ref, 'processing');
        setTimeout(async () => {
          STATUS_MAP.set(ref, 'funds_converted');
          const axios = require('axios');
          const jwt = require('jsonwebtoken');
          const token = jwt.sign({ service: 'wise' }, process.env.SERVICE_JWT_SECRET, { expiresIn: '5m' });
          await axios.post(`${this.callbackBaseUrl}/webhooks/payment/wise`, {
            urc, ref, quoteId, status: 'SUCCESSFUL', provider: 'wise', country, type: 'collection',
          }, { headers: { 'x-service-token': token }, timeout: 5000 });
        }, 2000);
      } catch (e) {
        logger.error({ msg: '[MockWise] Callback failed', error: e.message });
      }
    }, 2000);

    return { ref, quoteId, status: 'PENDING', provider: 'wise' };
  }

  async requestDisbursement({ urc, amount, currency, iban, bic, recipientName, country }) {
    const ref = `WISE_T_${uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
    STATUS_MAP.set(ref, 'processing');
    logger.info({ msg: '[MockWise] Disbursement initiated', ref, urc, amount });

    setTimeout(async () => {
      try {
        STATUS_MAP.set(ref, 'outgoing_payment_sent');
        const axios = require('axios');
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ service: 'wise' }, process.env.SERVICE_JWT_SECRET, { expiresIn: '5m' });
        await axios.post(`${this.callbackBaseUrl}/webhooks/payment/wise`, {
          urc, ref, status: 'SUCCESSFUL', provider: 'wise', country, type: 'payout',
        }, { headers: { 'x-service-token': token }, timeout: 5000 });
      } catch (e) {
        logger.error({ msg: '[MockWise] Payout callback failed', error: e.message });
      }
    }, 4000);

    return { ref, status: 'PENDING', provider: 'wise' };
  }

  async checkStatus(ref) {
    return { ref, status: STATUS_MAP.get(ref) || 'UNKNOWN', provider: 'wise' };
  }

  async cancelPayment(ref) {
    STATUS_MAP.set(ref, 'cancelled');
    return { ref, status: 'CANCELLED' };
  }
}

module.exports = MockWiseProvider;
