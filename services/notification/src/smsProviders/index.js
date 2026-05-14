function getProvider() {
  const provider = process.env.SMS_PROVIDER || 'mock_africas_talking';
  switch (provider) {
    case 'twilio':
    case 'mock_twilio': {
      const MockTwilio = require('./mockTwilio');
      return new MockTwilio();
    }
    case 'africas_talking':
    case 'mock_africas_talking':
    default: {
      const MockAT = require('./mockAfricasTalking');
      return new MockAT();
    }
  }
}

module.exports = { getProvider };
