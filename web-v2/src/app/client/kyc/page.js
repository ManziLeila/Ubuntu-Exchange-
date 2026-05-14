'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ShieldCheck, CheckCircle, Clock, XCircle, AlertTriangle, ChevronRight, Mail, CreditCard, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import { useSocket } from '../../../contexts/SocketContext';
import { useAuth } from '../../../contexts/AuthContext';
import Spinner from '../../../components/ui/Spinner';
import Badge from '../../../components/ui/Badge';

const ID_TYPES = [
  { value: 'national_id',    label: 'National ID Card' },
  { value: 'passport',       label: 'Passport' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'residence_permit', label: 'Residence Permit' },
];

const STATUS_CONFIG = {
  APPROVED:      { icon: CheckCircle,  color: '#16a34a', bg: 'rgba(22,163,74,.08)',  badge: 'success', label: 'Verified' },
  UNDER_REVIEW:  { icon: Clock,        color: '#2563eb', bg: 'rgba(37,99,235,.08)',  badge: 'info',    label: 'Under Review' },
  PENDING:       { icon: Clock,        color: '#d97706', bg: 'rgba(217,119,6,.08)',  badge: 'warning', label: 'Pending' },
  REJECTED:      { icon: XCircle,      color: '#dc2626', bg: 'rgba(220,38,38,.08)', badge: 'danger',  label: 'Rejected' },
  REQUIRES_DOCS: { icon: AlertTriangle,color: '#d97706', bg: 'rgba(217,119,6,.08)', badge: 'warning', label: 'More Info Needed' },
};

// ─── Step 1: ID Details form ────────────────────────────────────────────────
function StepIdDetails({ onNext }) {
  const [idType, setIdType]     = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [expiry, setExpiry]     = useState('');
  const [busy, setBusy]         = useState(false);

  const submit = async () => {
    if (!idType)     { toast.error('Select an ID type'); return; }
    if (!idNumber.trim()) { toast.error('Enter your ID number'); return; }
    setBusy(true);
    try {
      await api.post('/api/v1/kyc/submit-id', { idType, idNumber: idNumber.trim(), expiryDate: expiry || null });
      onNext({ idType, idNumber: idNumber.trim() });
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not save ID details. Try again.');
    } finally { setBusy(false); }
  };

  return (
    <div style={{ maxWidth: 540 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#c9a870,#d4af7a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CreditCard size={20} color="#07111f" />
        </div>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f0e2c4', margin: 0 }}>Identity Document</h2>
          <p style={{ fontSize: 13, color: 'rgba(245,240,232,.45)', margin: 0 }}>Enter your government-issued ID details</p>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>ID Type</label>
        <select value={idType} onChange={e => setIdType(e.target.value)} style={selectStyle}>
          <option value="">Select ID type…</option>
          {ID_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>ID Number</label>
        <input
          type="text"
          value={idNumber}
          onChange={e => setIdNumber(e.target.value)}
          placeholder="e.g. 1 1990 8 0012345 1 09"
          style={inputStyle}
        />
        <p style={{ fontSize: 11, color: 'rgba(245,240,232,.3)', marginTop: 5 }}>Enter exactly as printed on your document</p>
      </div>

      <div style={{ marginBottom: 28 }}>
        <label style={labelStyle}>Expiry Date <span style={{ color: 'rgba(245,240,232,.3)', fontWeight: 400 }}>(optional)</span></label>
        <input
          type="date"
          value={expiry}
          onChange={e => setExpiry(e.target.value)}
          style={{ ...inputStyle, colorScheme: 'dark' }}
        />
      </div>

      <button onClick={submit} disabled={busy} style={primaryBtnStyle}>
        {busy ? <><Spinner size="sm" /> Saving…</> : <>Continue <ChevronRight size={16} /></>}
      </button>
    </div>
  );
}

// ─── Step 2: Email OTP verification ─────────────────────────────────────────
function StepEmailOtp({ onNext }) {
  const { user } = useAuth();
  const [otpId, setOtpId]         = useState(null);
  const [code, setCode]           = useState(['', '', '', '', '', '']);
  const [sending, setSending]     = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown]   = useState(0);
  const refs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  const sendOtp = async () => {
    setSending(true);
    try {
      const res = await api.post('/api/v1/otp/request', { purpose: 'kyc_verification' });
      setOtpId(res.data.otpId);
      toast.success(`OTP sent to ${user?.email ?? 'your email'}`);
      setCooldown(60);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not send OTP.');
    } finally { setSending(false); }
  };

  // auto-send on mount
  useEffect(() => { sendOtp(); }, []); // eslint-disable-line

  // cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleDigit = (idx, val) => {
    const digits = val.replace(/\D/g, '').slice(0, 1);
    const next = [...code];
    next[idx] = digits;
    setCode(next);
    if (digits && idx < 5) refs[idx + 1].current?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      refs[idx - 1].current?.focus();
    }
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      setCode(text.split(''));
      refs[5].current?.focus();
    }
    e.preventDefault();
  };

  const verify = async () => {
    const full = code.join('');
    if (full.length < 6) { toast.error('Enter all 6 digits'); return; }
    if (!otpId)           { toast.error('Request a new OTP first'); return; }
    setVerifying(true);
    try {
      await api.post('/api/v1/otp/verify', { otpId, code: full, purpose: 'kyc_verification' });
      onNext();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Invalid or expired OTP.');
      setCode(['', '', '', '', '', '']);
      refs[0].current?.focus();
    } finally { setVerifying(false); }
  };

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#c9a870,#d4af7a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Mail size={20} color="#07111f" />
        </div>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f0e2c4', margin: 0 }}>Email Verification</h2>
          <p style={{ fontSize: 13, color: 'rgba(245,240,232,.45)', margin: 0 }}>
            We sent a 6-digit code to <strong style={{ color: '#c9a870' }}>{user?.email ?? 'your email'}</strong>
          </p>
        </div>
      </div>

      {/* OTP boxes */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24 }}>
        {code.map((d, i) => (
          <input
            key={i}
            ref={refs[i]}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={e => handleDigit(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            onPaste={handlePaste}
            style={{
              width: 52, height: 60, borderRadius: 12,
              border: `1.5px solid ${d ? 'rgba(201,168,112,.6)' : 'rgba(255,255,255,.12)'}`,
              background: 'rgba(255,255,255,.05)',
              color: '#f0e2c4', fontSize: 24, fontWeight: 700,
              textAlign: 'center', outline: 'none',
              transition: 'border-color .15s',
            }}
          />
        ))}
      </div>

      <button onClick={verify} disabled={verifying || code.join('').length < 6} style={{ ...primaryBtnStyle, marginBottom: 16 }}>
        {verifying ? <><Spinner size="sm" /> Verifying…</> : 'Verify Email'}
      </button>

      <div style={{ textAlign: 'center' }}>
        {cooldown > 0 ? (
          <p style={{ fontSize: 13, color: 'rgba(245,240,232,.35)' }}>Resend in {cooldown}s</p>
        ) : (
          <button onClick={sendOtp} disabled={sending} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#c9a870', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={13} /> {sending ? 'Sending…' : 'Resend OTP'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Step 3: Done ────────────────────────────────────────────────────────────
function StepDone() {
  return (
    <div style={{ maxWidth: 480, textAlign: 'center', paddingTop: 20 }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(22,163,74,.12)', border: '2px solid rgba(22,163,74,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
        <CheckCircle size={32} color="#16a34a" />
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f0e2c4', marginBottom: 10 }}>Verification Submitted</h2>
      <p style={{ fontSize: 14, color: 'rgba(245,240,232,.5)', lineHeight: 1.7, maxWidth: 360, margin: '0 auto 28px' }}>
        Your identity details and email have been verified. Our compliance team will review and approve your account within 24 hours.
      </p>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 100, background: 'rgba(201,168,112,.08)', border: '1px solid rgba(201,168,112,.2)', fontSize: 13, color: '#c9a870', fontWeight: 600 }}>
        <Clock size={14} /> Under Review — typically 24h
      </div>
    </div>
  );
}

// ─── Main KYC page ───────────────────────────────────────────────────────────
export default function KycPage() {
  const { socket } = useSocket();
  const [status, setStatus]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep]       = useState(1); // 1 = ID details, 2 = OTP, 3 = done

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/kyc/status');
      setStatus(res.data.data ?? res.data);
    } catch { /* no app yet */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!socket) return;
    socket.on('kyc:updated', load);
    return () => socket.off('kyc:updated', load);
  }, [socket, load]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
      <Spinner size="lg" />
    </div>
  );

  const kycStatus = status?.status;
  const isApproved = kycStatus === 'APPROVED';
  const isUnderReview = kycStatus === 'UNDER_REVIEW';

  // Already submitted → show status card only
  if (isApproved || isUnderReview) {
    const cfg = STATUS_CONFIG[kycStatus];
    const IconComp = cfg.icon;
    return (
      <div style={{ maxWidth: 600 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f0e2c4', marginBottom: 24 }}>KYC Verification</h1>
        <div style={{ borderRadius: 16, padding: 28, background: cfg.bg, border: `1px solid ${cfg.color}30`, display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <IconComp size={24} color={cfg.color} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <p style={{ fontWeight: 700, color: '#f0e2c4', fontSize: 16, margin: 0 }}>Verification Status</p>
              <Badge variant={cfg.badge}>{cfg.label}</Badge>
            </div>
            {kycStatus === 'APPROVED' && (
              <p style={{ fontSize: 14, color: 'rgba(245,240,232,.55)', margin: 0 }}>Your identity is verified. You can now send higher amounts and enjoy full platform access.</p>
            )}
            {kycStatus === 'UNDER_REVIEW' && (
              <p style={{ fontSize: 14, color: 'rgba(245,240,232,.55)', margin: 0 }}>Your details are under review by our compliance team. This usually takes up to 24 hours.</p>
            )}
            {status?.reviewNotes && <p style={{ fontSize: 13, color: 'rgba(245,240,232,.4)', marginTop: 8 }}>{status.reviewNotes}</p>}
          </div>
        </div>
      </div>
    );
  }

  // Rejected / Requires docs → allow re-submission (reset step to 1)
  const STEPS = [
    { num: 1, label: 'ID Details' },
    { num: 2, label: 'Email OTP' },
    { num: 3, label: 'Complete' },
  ];

  return (
    <div style={{ maxWidth: 620 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f0e2c4', marginBottom: 8 }}>KYC Verification</h1>
      <p style={{ fontSize: 14, color: 'rgba(245,240,232,.45)', marginBottom: 32 }}>
        Verify your identity to unlock full transfer limits. No document uploads needed.
      </p>

      {/* Rejected notice */}
      {(kycStatus === 'REJECTED' || kycStatus === 'REQUIRES_DOCS') && (
        <div style={{ borderRadius: 12, padding: '14px 18px', background: 'rgba(220,38,38,.08)', border: '1px solid rgba(220,38,38,.2)', marginBottom: 28, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <AlertTriangle size={18} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontWeight: 600, color: '#f87171', fontSize: 14, margin: '0 0 4px' }}>
              {kycStatus === 'REJECTED' ? 'Verification Rejected' : 'Additional Information Required'}
            </p>
            <p style={{ fontSize: 13, color: 'rgba(245,240,232,.45)', margin: 0 }}>
              {status?.reviewNotes ?? 'Please re-submit your details below.'}
            </p>
          </div>
        </div>
      )}

      {/* Step progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 36 }}>
        {STEPS.map((s, i) => (
          <div key={s.num} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700,
                background: step > s.num ? 'linear-gradient(135deg,#c9a870,#d4af7a)' : step === s.num ? 'rgba(201,168,112,.15)' : 'rgba(255,255,255,.05)',
                border: step === s.num ? '2px solid #c9a870' : step > s.num ? 'none' : '1.5px solid rgba(255,255,255,.1)',
                color: step > s.num ? '#07111f' : step === s.num ? '#c9a870' : 'rgba(245,240,232,.3)',
              }}>
                {step > s.num ? <CheckCircle size={16} color="#07111f" /> : s.num}
              </div>
              <span style={{ fontSize: 11, color: step >= s.num ? '#c9a870' : 'rgba(245,240,232,.3)', fontWeight: step === s.num ? 600 : 400, whiteSpace: 'nowrap' }}>{s.label}</span>
            </div>
            {i < 2 && (
              <div style={{ flex: 1, height: 2, background: step > s.num ? 'linear-gradient(90deg,#c9a870,#d4af7a)' : 'rgba(255,255,255,.08)', margin: '0 8px', marginBottom: 22, borderRadius: 1 }} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, padding: '32px 36px' }}>
        {step === 1 && <StepIdDetails onNext={() => setStep(2)} />}
        {step === 2 && <StepEmailOtp onNext={() => setStep(3)} />}
        {step === 3 && <StepDone />}
      </div>
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const labelStyle = {
  display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(245,240,232,.7)', marginBottom: 7,
};

const inputStyle = {
  width: '100%', padding: '12px 16px', borderRadius: 10,
  border: '1.5px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.05)',
  color: '#f0e2c4', fontSize: 14, outline: 'none',
};

const selectStyle = {
  ...inputStyle,
  appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(245,240,232,0.4)' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
  paddingRight: 36,
};

const primaryBtnStyle = {
  width: '100%', padding: '14px', borderRadius: 10,
  background: 'linear-gradient(135deg,#c9a870,#d4af7a)',
  color: '#07111f', fontWeight: 700, fontSize: 15, border: 'none',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: 8, transition: 'opacity .15s',
};
