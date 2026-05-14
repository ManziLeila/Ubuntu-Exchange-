const MockMomoProvider = require('./payment/mockMomoProvider');
const MockAirtelProvider = require('./payment/mockAirtelProvider');
const MockBankProvider = require('./payment/mockBankProvider');
const MockWiseProvider = require('./payment/mockWiseProvider');
const MockSmileProvider = require('./kyc/mockSmileProvider');
const MockSumsubProvider = require('./kyc/mockSumsubProvider');
const MockComplyAdvProvider = require('./aml/mockComplyAdvProvider');
const MockAfricasTalkingProvider = require('./sms/mockAfricasTalkingProvider');
const MockTwilioProvider = require('./sms/mockTwilioProvider');

const BASE = process.env.CORE_INTERNAL_URL || 'http://localhost:3001';

function getPaymentProvider(name) {
  const provider = name || process.env.PAYMENT_PROVIDER || 'mock_momo';
  switch (provider) {
    case 'airtel': return new MockAirtelProvider(BASE);
    case 'bank': return new MockBankProvider(BASE);
    case 'wise': case 'thunes': return new MockWiseProvider(BASE);
    case 'mock_momo': default: return new MockMomoProvider(BASE);
  }
}

function getKycProvider(name) {
  const provider = name || process.env.KYC_PROVIDER || 'mock_smile';
  switch (provider) {
    case 'sumsub': case 'mock_sumsub': return new MockSumsubProvider();
    case 'smile': case 'mock_smile': default: return new MockSmileProvider();
  }
}

function getAmlProvider(name) {
  const provider = name || process.env.AML_PROVIDER || 'mock_complyadv';
  switch (provider) {
    case 'mock_complyadv': default: return new MockComplyAdvProvider();
  }
}

function getSmsProvider(name) {
  const provider = name || process.env.SMS_PROVIDER || 'mock_africas_talking';
  switch (provider) {
    case 'twilio': case 'mock_twilio': return new MockTwilioProvider();
    case 'africas_talking': case 'mock_africas_talking': default: return new MockAfricasTalkingProvider();
  }
}

module.exports = { getPaymentProvider, getKycProvider, getAmlProvider, getSmsProvider };
