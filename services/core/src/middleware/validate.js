const { z } = require('zod');

// Reusable field validators
const email = z.string().email().transform(v => v.toLowerCase().trim());
const msisdn = z.string().regex(/^\+[1-9]\d{7,14}$/, 'MSISDN must be in E.164 format (e.g. +250781234567)');
const amount = z.number().positive().finite().multipleOf(0.01).max(100_000_000);
const currency = z.enum(['RWF', 'GHS', 'UGX', 'KES', 'USD', 'EUR', 'GBP', 'AED', 'TZS']);
const urc = z.string().regex(/^[0-9]{12}$/, 'URC must be exactly 12 digits');

// Auth schemas
const registerSchema = z.object({
  email,
  name: z.string().min(2).max(100).trim(),
  password: z.string()
    .min(10, 'Password must be at least 10 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain a digit')
    .regex(/[^a-zA-Z0-9]/, 'Must contain a special character'),
  country: z.string().optional(),
  msisdn: msisdn.optional(),
});

const loginSchema = z.object({
  email,
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({ email });

const resetPasswordSchema = z.object({
  token: z.string().min(64).max(64),
  password: z.string().min(10),
});

// Transfer schemas
const initiateTransferSchema = z.object({
  corridor: z.string().regex(/^[A-Z]{3}_[A-Z]{3}$/),
  recipientName: z.string().min(2).max(100).trim(),
  recipientMsisdn: msisdn,
  recipientCountry: z.string().min(2).max(50),
  sendCurrency: currency,
  recvCurrency: currency,
  sendAmount: amount,
  fundingMethod: z.enum(['momo', 'cash', 'wallet']).default('momo'),
  payoutMethod: z.enum(['momo', 'cash', 'bank']).default('momo'),
  agentId: z.string().uuid().optional(),
});

const approveTransferSchema = z.object({
  adminNote: z.string().max(500).optional(),
});

const rejectTransferSchema = z.object({
  rejectionReason: z.string().min(5).max(500),
});

// Admin schemas
const topupLiquiditySchema = z.object({
  currency,
  amount,
  description: z.string().max(200).optional(),
});

const setSpreadSchema = z.object({
  corridor: z.string().regex(/^[A-Z]{3}_[A-Z]{3}$/),
  spreadPct: z.number().min(0).max(0.5),
});

// Beneficiary schemas
const beneficiarySchema = z.object({
  nickname: z.string().min(1).max(50).trim(),
  fullName: z.string().min(2).max(100).trim(),
  msisdn: msisdn.optional(),
  country: z.string().min(2).max(50),
  currency,
  bankName: z.string().max(100).optional(),
  bankAccount: z.string().max(50).optional(),
  bankCode: z.string().max(20).optional(),
  payoutMethod: z.enum(['momo', 'bank', 'cash']).default('momo'),
  isFavorite: z.boolean().optional(),
});

// OTP schemas
const otpRequestSchema = z.object({
  purpose: z.enum(['transaction_confirm', 'login_2fa', 'phone_verify', 'kyc_verification']),
  reference: z.string().optional(),
});

const otpVerifySchema = z.object({
  otpId: z.string().uuid(),
  code: z.string().regex(/^[0-9]{6}$/, 'OTP must be 6 digits'),
  purpose: z.enum(['transaction_confirm', 'login_2fa', 'phone_verify', 'kyc_verification']),
  reference: z.string().optional(),
});

// Report schema
const reportRequestSchema = z.object({
  type: z.enum(['transaction', 'commission', 'forex_gain_loss', 'compliance', 'audit', 'settlement', 'revenue']),
  title: z.string().min(2).max(200).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  corridor: z.string().regex(/^[A-Z]{3}_[A-Z]{3}$/).optional(),
  agentId: z.string().uuid().optional(),
  status: z.string().optional(),
});

// System config schema
const systemConfigSchema = z.object({
  value: z.any(),
  description: z.string().max(500).optional(),
  category: z.enum(['general', 'fraud', 'limits', 'fees', 'kyc', 'notifications']).optional(),
});

// KYC review schema
const kycReviewSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'REQUIRES_DOCS', 'UNDER_REVIEW']),
  reviewNotes: z.string().max(1000).optional(),
  rejectionReason: z.string().max(500).optional(),
});

// Fraud alert resolution schema
const fraudResolutionSchema = z.object({
  status: z.enum(['RESOLVED', 'FALSE_POSITIVE', 'INVESTIGATING']),
  resolution: z.string().min(5).max(1000),
});

// Transaction limit schema
const transactionLimitSchema = z.object({
  role: z.enum(['client', 'agent']),
  maxSingleAmount: amount.optional(),
  maxDailyAmount: amount.optional(),
  maxMonthlyAmount: amount.optional(),
  currency: currency.optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  initiateTransferSchema,
  approveTransferSchema,
  rejectTransferSchema,
  topupLiquiditySchema,
  setSpreadSchema,
  beneficiarySchema,
  otpRequestSchema,
  otpVerifySchema,
  reportRequestSchema,
  systemConfigSchema,
  kycReviewSchema,
  fraudResolutionSchema,
  transactionLimitSchema,
};
