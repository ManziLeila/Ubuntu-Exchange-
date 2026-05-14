const { v4: uuidv4 } = require('uuid');
const SmsProviderInterface = require('./interface');
const logger = require('../../utils/logger');

class MockTwilioProvider extends SmsProviderInterface {
  async send(msisdn, message) {
    const sid = `SM${uuidv4().replace(/-/g, '').slice(0, 32)}`;
    logger.info({ msg: '[MockTwilio] SMS sent', sid, to: msisdn, preview: message.slice(0, 50) });
    return {
      sid,
      provider: 'twilio',
      status: 'sent',
      to: msisdn,
      from: process.env.TWILIO_FROM || '+15005550006',
      body: message,
      direction: 'outbound-api',
      price: '-0.00750',
      priceUnit: 'USD',
      dateCreated: new Date().toISOString(),
    };
  }

  async sendBulk(recipients) {
    const results = await Promise.all(recipients.map(r => this.send(r.msisdn, r.message)));
    return { provider: 'twilio', results, totalSent: results.length };
  }
}

module.exports = MockTwilioProvider;
