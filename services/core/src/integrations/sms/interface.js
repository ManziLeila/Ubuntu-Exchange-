class SmsProviderInterface {
  async send(msisdn, message) { throw new Error('Not implemented'); }
  async sendBulk(recipients) { throw new Error('Not implemented'); }
}

module.exports = SmsProviderInterface;
