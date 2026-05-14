class MockAfricasTalkingProvider {
  async send(msisdn, message) {
    const messageId = `AT_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    console.log(`[MockAT] SMS → ${msisdn}: ${message.slice(0, 80)}`);
    return { messageId, provider: 'africas_talking', status: 'Success', statusCode: 101, to: msisdn };
  }
}

module.exports = MockAfricasTalkingProvider;
