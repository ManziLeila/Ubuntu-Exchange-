/**
 * Email templates for GlobalTransact Notification Service
 * Each function returns { subject, html, text }
 */

const baseStyle = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f6f8; margin: 0; padding: 0; }
  .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); padding: 36px 40px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
  .header p { color: rgba(255,255,255,0.7); margin: 6px 0 0; font-size: 13px; }
  .body { padding: 40px; }
  .body h2 { color: #1a1a2e; font-size: 20px; margin: 0 0 16px; }
  .body p { color: #4a5568; line-height: 1.6; margin: 0 0 16px; }
  .card { background: #f7f9fc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px 24px; margin: 24px 0; }
  .card-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
  .card-row:last-child { border-bottom: none; }
  .card-label { color: #718096; font-size: 13px; }
  .card-value { color: #1a1a2e; font-weight: 600; font-size: 14px; }
  .urc { background: #1a1a2e; color: #f6c90e; font-family: monospace; font-size: 28px; letter-spacing: 4px; text-align: center; padding: 20px; border-radius: 8px; margin: 24px 0; }
  .btn { display: inline-block; background: linear-gradient(135deg, #0f3460, #1a1a2e); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 8px 0; }
  .footer { background: #f7f9fc; padding: 24px 40px; text-align: center; color: #a0aec0; font-size: 12px; border-top: 1px solid #e2e8f0; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  .badge-pending { background: #fef3c7; color: #92400e; }
  .badge-success { background: #d1fae5; color: #065f46; }
  .badge-error { background: #fee2e2; color: #991b1b; }
  .amount-big { font-size: 32px; font-weight: 700; color: #1a1a2e; text-align: center; margin: 8px 0; }
  .arrow { text-align: center; color: #a0aec0; font-size: 24px; margin: 0; }
`;

function wrapTemplate(content) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>${baseStyle}</style></head><body><div class="wrapper">
    <div class="header"><h1>🌍 GlobalTransact</h1><p>International Money Transfer</p></div>
    <div class="body">${content}</div>
    <div class="footer">GlobalTransact · Kigali, Rwanda · <a href="#" style="color:#a0aec0">Unsubscribe</a><br>This is an automated message. Please do not reply.</div>
  </div></body></html>`;
}

const templates = {
  welcome_client: ({ name }) => ({
    subject: 'Welcome to GlobalTransact!',
    html: wrapTemplate(`
      <h2>Welcome, ${name}! 👋</h2>
      <p>Your GlobalTransact account is ready. You can now send money across borders at transparent exchange rates.</p>
      <p>With GlobalTransact you can:</p>
      <ul style="color:#4a5568;line-height:2">
        <li>Send money from Rwanda to Ghana, Uganda, Kenya and more</li>
        <li>See real-time exchange rates before you transfer</li>
        <li>Track every transfer from initiation to delivery</li>
      </ul>
      <div style="text-align:center;margin:32px 0"><a class="btn" href="${process.env.FRONTEND_URL}/login">Start Sending →</a></div>
    `),
    text: `Welcome ${name}! Your GlobalTransact account is ready. Login at ${process.env.FRONTEND_URL}/login`
  }),

  welcome_agent: ({ name, email, tempPassword, loginUrl }) => ({
    subject: 'Your GlobalTransact Agent Account',
    html: wrapTemplate(`
      <h2>Welcome, Agent ${name}! 🤝</h2>
      <p>Your GlobalTransact agent account has been created. Use the credentials below to log in.</p>
      <div class="card">
        <div class="card-row"><span class="card-label">Email</span><span class="card-value">${email}</span></div>
        <div class="card-row"><span class="card-label">Temporary Password</span><span class="card-value" style="font-family:monospace;font-size:16px">${tempPassword}</span></div>
      </div>
      <p style="color:#e53e3e;font-size:13px">⚠️ Please change your password immediately after first login.</p>
      <div style="text-align:center;margin:32px 0"><a class="btn" href="${loginUrl}">Login to Dashboard →</a></div>
    `),
    text: `Agent ${name}: Login at ${loginUrl} with email ${email} and password ${tempPassword}. Change your password immediately.`
  }),

  transfer_initiated: ({ name, urc, sendAmount, sendCurrency, recvAmount, recvCurrency, recipientName, recipientMsisdn }) => ({
    subject: `Transfer Initiated — ${sendCurrency} ${sendAmount}`,
    html: wrapTemplate(`
      <h2>Transfer Initiated ⏳</h2>
      <p>Hi ${name}, your transfer is being processed. Here are the details:</p>
      <div class="card">
        <div class="card-row"><span class="card-label">Amount Sent</span><span class="card-value">${sendCurrency} ${parseFloat(sendAmount).toLocaleString()}</span></div>
        <div class="card-row"><span class="card-label">Recipient Receives</span><span class="card-value">${recvCurrency} ${parseFloat(recvAmount).toFixed(2)}</span></div>
        <div class="card-row"><span class="card-label">Recipient</span><span class="card-value">${recipientName}</span></div>
        <div class="card-row"><span class="card-label">To MoMo Number</span><span class="card-value">${recipientMsisdn}</span></div>
      </div>
      <p style="font-weight:600">Your Reference Code (URC):</p>
      <div class="urc">${urc}</div>
      <p style="font-size:13px;color:#718096">Your transfer is awaiting admin review. You will be notified once it's approved and sent.</p>
    `),
    text: `Hi ${name}, your transfer of ${sendCurrency} ${sendAmount} (URC: ${urc}) is being processed.`
  }),

  transfer_approved: ({ name, urc, recvAmount, recvCurrency, recipientName, recipientMsisdn }) => ({
    subject: `Transfer Approved ✅ — Payout in Progress`,
    html: wrapTemplate(`
      <h2>Transfer Approved! ✅</h2>
      <p>Hi ${name}, great news! Your transfer has been approved.</p>
      <div class="card">
        <div class="card-row"><span class="card-label">URC</span><span class="card-value" style="font-family:monospace">${urc}</span></div>
        <div class="card-row"><span class="card-label">Recipient</span><span class="card-value">${recipientName}</span></div>
        <div class="card-row"><span class="card-label">MoMo Number</span><span class="card-value">${recipientMsisdn}</span></div>
        <div class="card-row"><span class="card-label">Payout Amount</span><span class="card-value">${recvCurrency} ${parseFloat(recvAmount).toFixed(2)}</span></div>
      </div>
      <p style="font-size:13px;color:#718096">The funds are on their way. Delivery is typically within a few minutes.</p>
    `),
    text: `Hi ${name}, your transfer (URC: ${urc}) has been approved. ${recvCurrency} ${recvAmount} is being sent to ${recipientName}.`
  }),

  transfer_completed: ({ name, urc, recvAmount, recvCurrency, recipientName }) => ({
    subject: `Money Delivered! ${recvCurrency} ${recvAmount} sent ✅`,
    html: wrapTemplate(`
      <h2>Transfer Complete! 🎉</h2>
      <p>Hi ${name}, your transfer has been successfully delivered.</p>
      <div class="amount-big">${recvCurrency} ${parseFloat(recvAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
      <p class="arrow">↓</p>
      <p style="text-align:center;font-weight:600;color:#1a1a2e">${recipientName}</p>
      <div class="card" style="margin-top:24px">
        <div class="card-row"><span class="card-label">Reference</span><span class="card-value" style="font-family:monospace">${urc}</span></div>
        <div class="card-row"><span class="card-label">Status</span><span class="badge badge-success">Delivered</span></div>
      </div>
      <p style="font-size:13px;color:#718096">Thank you for using GlobalTransact. Send again anytime!</p>
    `),
    text: `Hi ${name}, your transfer (URC: ${urc}) of ${recvCurrency} ${recvAmount} has been delivered to ${recipientName}.`
  }),

  transfer_rejected: ({ name, urc, sendAmount, sendCurrency, rejectionReason, willRefund }) => ({
    subject: `Transfer Could Not Be Processed — URC ${urc}`,
    html: wrapTemplate(`
      <h2>Transfer Declined ❌</h2>
      <p>Hi ${name}, unfortunately your transfer could not be processed.</p>
      <div class="card">
        <div class="card-row"><span class="card-label">URC</span><span class="card-value" style="font-family:monospace">${urc}</span></div>
        <div class="card-row"><span class="card-label">Amount</span><span class="card-value">${sendCurrency} ${parseFloat(sendAmount).toLocaleString()}</span></div>
        <div class="card-row"><span class="card-label">Reason</span><span class="card-value">${rejectionReason}</span></div>
        <div class="card-row"><span class="card-label">Refund</span><span class="badge ${willRefund ? 'badge-success' : 'badge-pending'}">${willRefund ? 'Being processed' : 'N/A'}</span></div>
      </div>
      <p>If you have questions, please contact our support team.</p>
    `),
    text: `Hi ${name}, transfer (URC: ${urc}) was declined: ${rejectionReason}. ${willRefund ? 'A refund is being processed.' : ''}`
  }),

  password_reset: ({ name, resetUrl, expiresInHours }) => ({
    subject: 'Reset Your GlobalTransact Password',
    html: wrapTemplate(`
      <h2>Password Reset Request 🔐</h2>
      <p>Hi ${name}, we received a request to reset your password.</p>
      <div style="text-align:center;margin:32px 0"><a class="btn" href="${resetUrl}">Reset Password →</a></div>
      <p style="font-size:13px;color:#718096">This link expires in ${expiresInHours} hour(s). If you did not request this, please ignore this email — your account is safe.</p>
    `),
    text: `Hi ${name}, reset your password here: ${resetUrl} (expires in ${expiresInHours}h)`
  }),

  low_liquidity_alert: ({ currency, currentBalance, threshold }) => ({
    subject: `⚠️ Low Liquidity Alert — ${currency} Pool`,
    html: wrapTemplate(`
      <h2>Low Liquidity Warning ⚠️</h2>
      <p>The <strong>${currency}</strong> liquidity pool has fallen below the alert threshold.</p>
      <div class="card">
        <div class="card-row"><span class="card-label">Currency</span><span class="card-value">${currency}</span></div>
        <div class="card-row"><span class="card-label">Current Balance</span><span class="card-value badge badge-error">${currency} ${parseFloat(currentBalance).toLocaleString()}</span></div>
        <div class="card-row"><span class="card-label">Alert Threshold</span><span class="card-value">${currency} ${parseFloat(threshold).toLocaleString()}</span></div>
      </div>
      <p>Please top up the pool immediately to avoid transfer failures.</p>
      <div style="text-align:center;margin:24px 0"><a class="btn" href="${process.env.FRONTEND_URL}/admin/liquidity">Top Up Pool →</a></div>
    `),
    text: `Low liquidity alert: ${currency} pool at ${currentBalance} (threshold: ${threshold}). Top up immediately.`
  }),

  otp_code: ({ name, code, purpose, expiresInMinutes }) => {
    let purposeText = 'secure your account';
    if (purpose === 'transaction_confirm') purposeText = 'confirm your transaction';
    if (purpose === 'login_2fa') purposeText = 'log in (2FA)';
    if (purpose === 'phone_verify') purposeText = 'verify your phone number';
    if (purpose === 'password_reset') purposeText = 'reset your password';

    return {
      subject: `GlobalTransact OTP Code: ${code}`,
      html: wrapTemplate(`
        <h2>Your OTP Verification Code 🔐</h2>
        <p>Hi ${name},</p>
        <p>Use the verification code below to ${purposeText}. This code is valid for <strong>${expiresInMinutes} minutes</strong>.</p>
        <div class="urc">${code}</div>
        <p style="color:#e53e3e;font-size:13px;text-align:center;">⚠️ For your security, never share this code with anyone, including GlobalTransact staff.</p>
        <p style="font-size:13px;color:#718096;margin-top:24px;">If you did not initiate this request, please secure your account immediately or contact support.</p>
      `),
      text: `Hi ${name}, your GlobalTransact OTP verification code is ${code}. It is valid for ${expiresInMinutes} minutes to ${purposeText}. Do not share this code.`
    };
  },
};

module.exports = templates;
