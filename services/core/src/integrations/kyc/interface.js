class KycProviderInterface {
  async submitDocument(userId, filePath, docType) { throw new Error('Not implemented'); }
  async getStatus(jobId) { throw new Error('Not implemented'); }
  async getResult(jobId) { throw new Error('Not implemented'); }
}

module.exports = KycProviderInterface;
