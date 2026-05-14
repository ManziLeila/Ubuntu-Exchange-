const { v4: uuidv4 } = require('uuid');
const SmsProviderInterface = require('./interface');
const logger = require('../../utils/logger');

class MockAfricasTalkingProvider extends SmsProviderInterface {
  async send(msisdn, message) {
    const messageId = `AT_${uuidv4().slice(0, 8).toUpperCase()}`;
    logger.info({ msg: '[MockAT] SMS sent', messageId, to: msisdn, preview: message.slice(0, 50) });
    return {
      messageId,
      provider: 'africas_talking',
      status: 'Success',
      statusCode: 101,
      cost: 'KES 0.8',
      recipients: [{ number: msisdn, status: 'Success', statusCode: 101, cost: 'KES 0.8', messageId }],
    };
  }

  async sendBulk(recipients) {
    const results = await Promise.all(recipients.map(r => this.send(r.msisdn, r.message)));
    return { provider: 'africas_talking', results, totalSent: results.length };
  }
}

module.exports = MockAfricasTalkingProvider;
