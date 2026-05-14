const crypto = require('crypto');

/**
 * Generate a cryptographically random 12-digit URC.
 * Never sequential, never predictable.
 */
function generateURC() {
  // Generate random bytes and convert to a 12-digit number
  const bytes = crypto.randomBytes(6);
  const num = BigInt('0x' + bytes.toString('hex'));
  // Ensure exactly 12 digits by taking modulo and padding
  const urc = (num % 900000000000n + 100000000000n).toString();
  return urc;
}

/**
 * Generate a secure reset token (32 bytes hex).
 */
function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Format a Decimal amount for display.
 */
function formatAmount(amount, currency) {
  const num = parseFloat(amount.toString());
  return `${currency} ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

module.exports = { generateURC, generateResetToken, formatAmount };
