class MockTwilioProvider {
  async send(msisdn, message) {
    const sid = `SM${Date.now()}${Math.random().toString(36).slice(2, 12)}`;
    console.log(`[MockTwilio] SMS → ${msisdn}: ${message.slice(0, 80)}`);
    return { sid, provider: 'twilio', status: 'sent', to: msisdn };
  }
}

module.exports = MockTwilioProvider;
