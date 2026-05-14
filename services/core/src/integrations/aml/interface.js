class AmlProviderInterface {
  async screenUser(userId, userData) { throw new Error('Not implemented'); }
  async screenTransaction(transferId, txData) { throw new Error('Not implemented'); }
  async getReport(checkId) { throw new Error('Not implemented'); }
}

module.exports = AmlProviderInterface;
