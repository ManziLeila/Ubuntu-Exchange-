const { v4: uuidv4 } = require('uuid');
const PaymentProviderInterface = require('./interface');
const logger = require('../../utils/logger');

const STATUS_MAP = new Map();

class MockBankProvider extends PaymentProviderInterface {
  constructor(callbackBaseUrl) {
    super();
    this.callbackBaseUrl = callbackBaseUrl || process.env.CORE_INTERNAL_URL || 'http://localhost:3001';
  }

  async requestCollection({ urc, amount, currency, accountNumber, bankCode, country }) {
    const ref = `BANK_COLL_${uuidv4().replace(/-/g, '').slice(0, 14).toUpperCase()}`;
    STATUS_MAP.set(ref, 'PENDING');
    logger.info({ msg: '[MockBank] Collection initiated', ref, urc, amount });

    // Bank collections are synchronous confirmations (500ms)
    setTimeout(async () => {
      try {
        STATUS_MAP.set(ref, 'SUCCESSFUL');
        const axios = require('axios');
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ service: 'bank' }, process.env.SERVICE_JWT_SECRET, { expiresIn: '5m' });
        await axios.post(`${this.callbackBaseUrl}/webhooks/payment/bank`, {
          urc, ref, status: 'SUCCESSFUL', provider: 'mock_bank', country, type: 'collection',
        }, { headers: { 'x-service-token': token }, timeout: 5000 });
      } catch (e) {
        logger.error({ msg: '[MockBank] Collection callback failed', error: e.message });
      }
    }, 500);

    return { ref, status: 'PENDING', provider: 'mock_bank' };
  }

  async requestDisbursement({ urc, amount, currency, accountNumber, bankCode, recipientName, country }) {
    const ref = `BANK_PAY_${uuidv4().replace(/-/g, '').slice(0, 14).toUpperCase()}`;
    STATUS_MAP.set(ref, 'PENDING');
    logger.info({ msg: '[MockBank] Disbursement initiated (T+1 simulation)', ref, urc });

    // Bank payouts simulate T+1 settlement (5s in mock)
    setTimeout(async () => {
      try {
        STATUS_MAP.set(ref, 'SUCCESSFUL');
        const axios = require('axios');
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ service: 'bank' }, process.env.SERVICE_JWT_SECRET, { expiresIn: '5m' });
        await axios.post(`${this.callbackBaseUrl}/webhooks/payment/bank`, {
          urc, ref, status: 'SUCCESSFUL', provider: 'mock_bank', country, type: 'payout',
        }, { headers: { 'x-service-token': token }, timeout: 5000 });
      } catch (e) {
        logger.error({ msg: '[MockBank] Payout callback failed', error: e.message });
      }
    }, 5000);

    return { ref, status: 'PENDING', provider: 'mock_bank', estimatedSettlement: 'T+1' };
  }

  async checkStatus(ref) {
    return { ref, status: STATUS_MAP.get(ref) || 'UNKNOWN', provider: 'mock_bank' };
  }

  async cancelPayment(ref) {
    STATUS_MAP.set(ref, 'CANCELLED');
    return { ref, status: 'CANCELLED' };
  }
}

module.exports = MockBankProvider;
