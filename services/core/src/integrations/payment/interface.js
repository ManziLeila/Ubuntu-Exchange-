class PaymentProviderInterface {
  async requestCollection(params) { throw new Error('Not implemented'); }
  async requestDisbursement(params) { throw new Error('Not implemented'); }
  async checkStatus(ref) { throw new Error('Not implemented'); }
  async cancelPayment(ref) { throw new Error('Not implemented'); }
}

module.exports = PaymentProviderInterface;
