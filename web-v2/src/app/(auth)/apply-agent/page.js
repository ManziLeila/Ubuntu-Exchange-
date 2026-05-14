'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, User, Building2, FileText, FileCheck, Upload, Printer, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';

// ─── Shared styles ────────────────────────────────────────────────────────────
const S = {
  label:  { display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(245,240,232,.65)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' },
  input:  { width: '100%', padding: '12px 15px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.05)', color: '#f0e2c4', fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  select: { width: '100%', padding: '12px 15px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,.1)', background: 'rgba(22,30,56,.8)', color: '#f0e2c4', fontSize: 14, outline: 'none', boxSizing: 'border-box', appearance: 'none' },
  err:    { fontSize: 11, color: '#f87171', marginTop: 4 },
  row:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
};

const STEPS = [
  { num: 1, label: 'Personal Info', icon: User },
  { num: 2, label: 'Business Info', icon: Building2 },
  { num: 3, label: 'KYB Documents', icon: FileText },
  { num: 4, label: 'Contract',      icon: FileCheck },
];

const TERRITORIES = ['Kigali', 'Northern Province', 'Southern Province', 'Eastern Province', 'Western Province', 'All Rwanda'];
const COUNTRIES   = [
  { code: 'RW', name: 'Rwanda' }, { code: 'KE', name: 'Kenya' }, { code: 'UG', name: 'Uganda' },
  { code: 'TZ', name: 'Tanzania' }, { code: 'NG', name: 'Nigeria' }, { code: 'GH', name: 'Ghana' },
  { code: 'GB', name: 'United Kingdom' }, { code: 'US', name: 'United States' },
];

// ─── Step 1: Personal Info ────────────────────────────────────────────────────
function Step1({ data, onChange, onNext }) {
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!data.name?.trim())     e.name     = 'Full name is required';
    if (!data.email?.trim())    e.email    = 'Email is required';
    if (!/\S+@\S+\.\S+/.test(data.email ?? '')) e.email = 'Invalid email';
    if (!data.password || data.password.length < 8) e.password = 'Min 8 characters';
    if (!/[A-Z]/.test(data.password ?? ''))  e.password = 'Must contain uppercase';
    if (!/[0-9]/.test(data.password ?? ''))  e.password = 'Must contain a number';
    if (data.password !== data.confirmPw)    e.confirmPw = 'Passwords do not match';
    if (!data.msisdn?.trim())   e.msisdn   = 'Phone number is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div>
      <p style={{ fontSize: 13, color: 'rgba(245,240,232,.45)', marginBottom: 24 }}>Your personal identity details — you'll use these to log in.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={S.label}>Full Name</label>
          <input style={S.input} value={data.name ?? ''} onChange={e => onChange('name', e.target.value)} placeholder="Jean Claude Uwase" />
          {errors.name && <p style={S.err}>{errors.name}</p>}
        </div>
        <div style={S.row}>
          <div>
            <label style={S.label}>Email Address</label>
            <input style={S.input} type="email" value={data.email ?? ''} onChange={e => onChange('email', e.target.value)} placeholder="you@business.com" />
            {errors.email && <p style={S.err}>{errors.email}</p>}
          </div>
          <div>
            <label style={S.label}>Phone (MSISDN)</label>
            <input style={S.input} type="tel" value={data.msisdn ?? ''} onChange={e => onChange('msisdn', e.target.value)} placeholder="+250780000001" />
            {errors.msisdn && <p style={S.err}>{errors.msisdn}</p>}
          </div>
        </div>
        <div>
          <label style={S.label}>Country of Residence</label>
          <select style={S.select} value={data.country ?? ''} onChange={e => onChange('country', e.target.value)}>
            <option value="">Select country…</option>
            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </div>
        <div style={S.row}>
          <div>
            <label style={S.label}>Password</label>
            <input style={S.input} type="password" value={data.password ?? ''} onChange={e => onChange('password', e.target.value)} placeholder="Min 8 chars, 1 uppercase, 1 number" />
            {errors.password && <p style={S.err}>{errors.password}</p>}
          </div>
          <div>
            <label style={S.label}>Confirm Password</label>
            <input style={S.input} type="password" value={data.confirmPw ?? ''} onChange={e => onChange('confirmPw', e.target.value)} placeholder="Repeat password" />
            {errors.confirmPw && <p style={S.err}>{errors.confirmPw}</p>}
          </div>
        </div>
      </div>
      <button onClick={() => validate() && onNext()} style={primaryBtn}>Continue <ArrowRight size={16} /></button>
    </div>
  );
}

// ─── Step 2: Business Info ────────────────────────────────────────────────────
function Step2({ data, onChange, onNext, onBack }) {
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!data.businessName?.trim()) e.businessName = 'Business name is required';
    if (!data.territory)            e.territory    = 'Select a territory';
    if (!data.bankName?.trim())     e.bankName     = 'Bank name is required';
    if (!data.bankAccount?.trim())  e.bankAccount  = 'Bank account is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div>
      <p style={{ fontSize: 13, color: 'rgba(245,240,232,.45)', marginBottom: 24 }}>Your business registration and banking details for commission payouts.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={S.label}>Business / Agency Name</label>
          <input style={S.input} value={data.businessName ?? ''} onChange={e => onChange('businessName', e.target.value)} placeholder="Uwase Money Transfer Agency" />
          {errors.businessName && <p style={S.err}>{errors.businessName}</p>}
        </div>
        <div style={S.row}>
          <div>
            <label style={S.label}>Business Registration Number <span style={{ color: 'rgba(245,240,232,.3)', fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
            <input style={S.input} value={data.businessRegNumber ?? ''} onChange={e => onChange('businessRegNumber', e.target.value)} placeholder="RDB-2024-XXXXXXX" />
          </div>
          <div>
            <label style={S.label}>Tax ID / TIN <span style={{ color: 'rgba(245,240,232,.3)', fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
            <input style={S.input} value={data.tinNumber ?? ''} onChange={e => onChange('tinNumber', e.target.value)} placeholder="1234567890" />
          </div>
        </div>
        <div>
          <label style={S.label}>Operating Territory</label>
          <select style={S.select} value={data.territory ?? ''} onChange={e => onChange('territory', e.target.value)}>
            <option value="">Select territory…</option>
            {TERRITORIES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {errors.territory && <p style={S.err}>{errors.territory}</p>}
        </div>
        <div>
          <label style={S.label}>Expected Monthly Volume (RWF)</label>
          <select style={S.select} value={data.monthlyVolume ?? ''} onChange={e => onChange('monthlyVolume', e.target.value)}>
            <option value="">Select range…</option>
            <option value="0-5M">0 – 5,000,000 RWF</option>
            <option value="5M-20M">5,000,000 – 20,000,000 RWF</option>
            <option value="20M-100M">20,000,000 – 100,000,000 RWF</option>
            <option value="100M+">100,000,000+ RWF</option>
          </select>
        </div>
        <div style={{ paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#c9a870', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 14 }}>Commission Payout Bank Account</p>
          <div style={S.row}>
            <div>
              <label style={S.label}>Bank Name</label>
              <input style={S.input} value={data.bankName ?? ''} onChange={e => onChange('bankName', e.target.value)} placeholder="Bank of Kigali" />
              {errors.bankName && <p style={S.err}>{errors.bankName}</p>}
            </div>
            <div>
              <label style={S.label}>Account Number</label>
              <input style={S.input} value={data.bankAccount ?? ''} onChange={e => onChange('bankAccount', e.target.value)} placeholder="000XXXXXXXXX" />
              {errors.bankAccount && <p style={S.err}>{errors.bankAccount}</p>}
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
        <button onClick={onBack} style={ghostBtn}><ArrowLeft size={16} /> Back</button>
        <button onClick={() => validate() && onNext()} style={{ ...primaryBtn, flex: 1 }}>Continue <ArrowRight size={16} /></button>
      </div>
    </div>
  );
}

// ─── Step 3: KYB Documents ────────────────────────────────────────────────────
function Step3({ files, setFile, onNext, onBack }) {
  const DOCS = [
    { key: 'id_document',   label: 'National ID / Passport', desc: 'Clear photo or scan of your government-issued ID', required: true },
    { key: 'business_cert', label: 'Business Registration Certificate', desc: 'RDB certificate or equivalent government document', required: true },
    { key: 'tin_cert',      label: 'TIN Certificate', desc: 'Rwanda Revenue Authority TIN certificate', required: true },
    { key: 'proof_address', label: 'Proof of Business Address', desc: 'Utility bill or bank statement (max 3 months old)', required: false },
  ];

  const validate = () => {
    const missing = DOCS.filter(d => d.required && !files[d.key]);
    if (missing.length > 0) {
      toast.error(`Please upload: ${missing.map(d => d.label).join(', ')}`);
      return false;
    }
    return true;
  };

  return (
    <div>
      <p style={{ fontSize: 13, color: 'rgba(245,240,232,.45)', marginBottom: 24 }}>
        Upload clear scans or photos. Accepted: JPG, PNG, PDF — max 5MB each.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {DOCS.map(({ key, label, desc, required }) => (
          <DocUploadField key={key} label={label} desc={desc} required={required} file={files[key]} onFile={f => setFile(key, f)} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
        <button onClick={onBack} style={ghostBtn}><ArrowLeft size={16} /> Back</button>
        <button onClick={() => validate() && onNext()} style={{ ...primaryBtn, flex: 1 }}>Continue <ArrowRight size={16} /></button>
      </div>
    </div>
  );
}

function DocUploadField({ label, desc, required, file, onFile }) {
  const ref = useRef();
  return (
    <div style={{ padding: '18px 20px', borderRadius: 12, border: `1.5px ${file ? 'solid rgba(201,168,112,.4)' : 'dashed rgba(255,255,255,.12)'}`, background: file ? 'rgba(201,168,112,.05)' : 'rgba(255,255,255,.02)', transition: 'all .15s' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#f0e2c4', margin: '0 0 4px' }}>
            {label} {required && <span style={{ color: '#f87171', fontSize: 11 }}>*</span>}
          </p>
          <p style={{ fontSize: 11, color: 'rgba(245,240,232,.4)', margin: 0 }}>{desc}</p>
          {file && <p style={{ fontSize: 11, color: '#c9a870', margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}><Check size={11} /> {file.name}</p>}
        </div>
        <button
          onClick={() => ref.current?.click()}
          style={{ padding: '8px 16px', borderRadius: 8, background: file ? 'rgba(201,168,112,.12)' : 'rgba(255,255,255,.06)', border: `1px solid ${file ? 'rgba(201,168,112,.3)' : 'rgba(255,255,255,.1)'}`, color: file ? '#c9a870' : 'rgba(245,240,232,.6)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
        >
          <Upload size={13} /> {file ? 'Replace' : 'Upload'}
        </button>
      </div>
      <input ref={ref} type="file" accept=".jpg,.jpeg,.png,.pdf" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]); }} />
    </div>
  );
}

// ─── Step 4: Contract ────────────────────────────────────────────────────────
function Step4({ data, files, setFile, onBack, onSubmit, submitting }) {
  const contractRef = useRef();

  const printContract = () => {
    const w = window.open('', '_blank');
    w.document.write(`
      <html><head><title>Ubuntu International Exchange — Agent Agreement</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 720px; margin: 40px auto; color: #111; line-height: 1.7; }
        h1 { font-size: 22px; border-bottom: 2px solid #c9a870; padding-bottom: 12px; }
        h2 { font-size: 16px; margin-top: 28px; color: #333; }
        .meta { background: #f8f4ec; padding: 16px; border-radius: 8px; margin: 20px 0; font-size: 14px; }
        p { font-size: 14px; }
        @media print { body { margin: 20px; } }
      </style></head><body>
      <h1>Agent Agreement — Ubuntu International Exchange Ltd</h1>
      <div class="meta">
        <strong>Agent Name:</strong> ${data.name ?? '___________'}<br>
        <strong>Business Name:</strong> ${data.businessName ?? '___________'}<br>
        <strong>Registration No.:</strong> ${data.businessRegNumber ?? '___________'}<br>
        <strong>Territory:</strong> ${data.territory ?? '___________'}<br>
        <strong>Date:</strong> ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
      </div>
      <p>This Agent Agreement ("Agreement") is entered into between <strong>Ubuntu International Exchange Ltd</strong> ("Company"), a remittance company duly registered in Rwanda, and the agent identified above ("Agent").</p>
      <h2>1. Appointment</h2>
      <p>The Company hereby appoints the Agent as a non-exclusive authorized agent to facilitate money transfer services on behalf of the Company within the designated territory. This appointment is personal and non-transferable.</p>
      <h2>2. Agent Obligations</h2>
      <p>The Agent agrees to: (a) comply with all applicable laws and regulations including the National Bank of Rwanda guidelines on money transfer; (b) maintain accurate records of all transactions; (c) collect and verify customer identity documents in accordance with Company KYC policy; (d) report any suspicious transactions to the Company's Compliance Officer within 24 hours; (e) maintain client confidentiality at all times.</p>
      <h2>3. Commission & Float</h2>
      <p>The Agent shall receive commission as agreed and notified by the Company from time to time, currently 0.5% of the send amount per completed transaction. Commission is credited to the Agent's wallet within 24 hours of transaction completion and paid out weekly to the registered bank account.</p>
      <h2>4. Compliance & AML</h2>
      <p>The Agent must adhere strictly to Anti-Money Laundering (AML) and Counter-Financing of Terrorism (CFT) regulations. The Agent shall not process transactions suspected of money laundering, terrorist financing, or any illegal activity. Failure to comply will result in immediate termination and potential criminal referral.</p>
      <h2>5. Termination</h2>
      <p>Either party may terminate this Agreement with 30 days' written notice. The Company may terminate immediately in case of fraud, regulatory breach, or reputational risk.</p>
      <h2>6. Limitation of Liability</h2>
      <p>The Company shall not be liable for any losses arising from the Agent's failure to comply with this Agreement, applicable laws, or Company policies.</p>
      <h2>7. Governing Law</h2>
      <p>This Agreement shall be governed by the laws of the Republic of Rwanda.</p>
      <br><br>
      <p><strong>Agent Signature:</strong> __________________________ &nbsp;&nbsp; <strong>Date:</strong> ______________</p>
      <p><strong>Print Name:</strong> __________________________</p>
      <br>
      <p><em>For Ubuntu International Exchange Ltd:</em></p>
      <p><strong>Authorised Signatory:</strong> __________________________ &nbsp;&nbsp; <strong>Date:</strong> ______________</p>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  return (
    <div>
      <p style={{ fontSize: 13, color: 'rgba(245,240,232,.45)', marginBottom: 24 }}>
        Review the agent agreement, print it, sign it, then scan/photograph and upload the signed copy below.
      </p>

      {/* Contract preview box */}
      <div ref={contractRef} style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.03)', padding: '20px 24px', maxHeight: 280, overflowY: 'auto', marginBottom: 20, fontSize: 13, color: 'rgba(245,240,232,.6)', lineHeight: 1.75 }}>
        <p style={{ fontWeight: 700, color: '#f0e2c4', fontSize: 15, marginBottom: 14 }}>Ubuntu International Exchange Ltd — Agent Agreement</p>
        <p><strong style={{ color: '#c9a870' }}>1. Appointment</strong><br />The Company appoints the Agent as a non-exclusive authorized agent to facilitate money transfer services within the designated territory. This appointment is personal and non-transferable.</p>
        <p style={{ marginTop: 12 }}><strong style={{ color: '#c9a870' }}>2. Agent Obligations</strong><br />Comply with all applicable laws; maintain accurate records; collect and verify customer KYC; report suspicious transactions within 24 hours; maintain client confidentiality at all times.</p>
        <p style={{ marginTop: 12 }}><strong style={{ color: '#c9a870' }}>3. Commission & Float</strong><br />0.5% commission per completed transaction, credited within 24h and paid weekly to registered bank account.</p>
        <p style={{ marginTop: 12 }}><strong style={{ color: '#c9a870' }}>4. AML/CFT Compliance</strong><br />Agent shall not process transactions suspected of money laundering or terrorist financing. Breach results in immediate termination and potential criminal referral.</p>
        <p style={{ marginTop: 12 }}><strong style={{ color: '#c9a870' }}>5. Termination</strong><br />30 days' notice by either party. Immediate termination for fraud, regulatory breach, or reputational risk.</p>
        <p style={{ marginTop: 12 }}><strong style={{ color: '#c9a870' }}>6. Governing Law</strong><br />Laws of the Republic of Rwanda.</p>
      </div>

      {/* Print button */}
      <button onClick={printContract} style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1.5px solid rgba(201,168,112,.35)', background: 'rgba(201,168,112,.08)', color: '#c9a870', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
        <Printer size={16} /> Print / Download Contract PDF
      </button>

      {/* Upload signed contract */}
      <DocUploadField
        label="Signed Contract"
        desc="Scan or photograph the signed and dated contract"
        required
        file={files.signed_contract}
        onFile={f => setFile('signed_contract', f)}
      />

      <div style={{ marginTop: 20, padding: '14px 16px', borderRadius: 10, background: 'rgba(217,119,6,.08)', border: '1px solid rgba(217,119,6,.18)', display: 'flex', gap: 10 }}>
        <AlertCircle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12, color: 'rgba(245,240,232,.5)', margin: 0, lineHeight: 1.6 }}>
          Your application will be reviewed by our team within <strong style={{ color: '#fbbf24' }}>48 business hours</strong>. You'll receive an email confirmation once your account is activated.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button onClick={onBack} style={ghostBtn} disabled={submitting}><ArrowLeft size={16} /> Back</button>
        <button onClick={onSubmit} disabled={submitting || !files.signed_contract} style={{ ...primaryBtn, flex: 1, opacity: submitting || !files.signed_contract ? 0.6 : 1 }}>
          {submitting
            ? <><span style={{ width: 16, height: 16, border: '2px solid #07111f', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} /> Submitting…</>
            : <>Submit Application <Check size={16} /></>
          }
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ApplyAgentPage() {
  const [step, setStep]       = useState(1);
  const [done, setDone]       = useState(false);
  const [submitting, setSub]  = useState(false);
  const [formData, setFormData] = useState({});
  const [files, setFiles]     = useState({});

  const updateField = (key, val) => setFormData(p => ({ ...p, [key]: val }));
  const setFile     = (key, f)  => setFiles(p => ({ ...p, [key]: f }));

  const submit = async () => {
    if (!files.signed_contract) { toast.error('Upload the signed contract'); return; }
    setSub(true);
    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => { if (v) fd.append(k, v); });
      Object.entries(files).forEach(([k, f])  => { if (f) fd.append(k, f); });

      await api.post('/api/v1/auth/agent-apply', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setDone(true);
    } catch (err) {
      toast.error(err?.response?.data?.error ?? err?.response?.data?.message ?? 'Submission failed. Try again.');
    } finally { setSub(false); }
  };

  if (done) {
    return (
      <div style={pageWrap}>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } } @keyframes fadein { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } } .panel { animation: fadein .4s ease }`}</style>
        <div className="panel" style={{ ...panel, textAlign: 'center', padding: '56px 40px' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(22,163,74,.12)', border: '2px solid rgba(22,163,74,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <CheckCircle size={32} color="#16a34a" />
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#f0e2c4', marginBottom: 12 }}>Application Submitted!</h2>
          <p style={{ fontSize: 14, color: 'rgba(245,240,232,.5)', lineHeight: 1.7, maxWidth: 380, margin: '0 auto 28px' }}>
            Thank you <strong style={{ color: '#c9a870' }}>{formData.name}</strong>. Your agent application is under review. You'll receive an email at <strong style={{ color: '#c9a870' }}>{formData.email}</strong> within 48 hours once approved.
          </p>
          <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 10, background: 'linear-gradient(135deg,#c9a870,#d4af7a)', color: '#07111f', fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={pageWrap}>
      <style>{`* { box-sizing: border-box } @keyframes spin { to { transform: rotate(360deg) } } @keyframes fadein { from { opacity:0; transform:translateX(10px) } to { opacity:1; transform:translateX(0) } } .panel { animation: fadein .35s ease }`}</style>

      {/* Back link */}
      <div style={{ maxWidth: 780, margin: '0 auto 24px', padding: '0 16px' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(245,240,232,.4)', textDecoration: 'none' }}>
          <ArrowLeft size={14} /> Back to website
        </Link>
      </div>

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 16px 48px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#c9a870,#f0e2c4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#07111f' }}>UI</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f0e2c4' }}>Ubuntu International</div>
              <div style={{ fontSize: 10, color: '#c9a870' }}>Exchange Ltd</div>
            </div>
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: '#f0e2c4', margin: '0 0 8px' }}>Become an Agent</h1>
          <p style={{ fontSize: 14, color: 'rgba(245,240,232,.45)', margin: 0 }}>
            Already have an account? <Link href="/login" style={{ color: '#c9a870', textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 36 }}>
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = step > s.num;
            const active = step === s.num;
            return (
              <div key={s.num} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? 'linear-gradient(135deg,#c9a870,#d4af7a)' : active ? 'rgba(201,168,112,.12)' : 'rgba(255,255,255,.04)', border: active ? '2px solid #c9a870' : done ? 'none' : '1.5px solid rgba(255,255,255,.1)' }}>
                    {done ? <Check size={16} color="#07111f" strokeWidth={3} /> : <Icon size={15} color={active ? '#c9a870' : 'rgba(245,240,232,.25)'} />}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, color: active || done ? '#c9a870' : 'rgba(245,240,232,.3)', whiteSpace: 'nowrap' }}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 2, margin: '0 8px', marginBottom: 22, background: step > s.num ? 'linear-gradient(90deg,#c9a870,#d4af7a)' : 'rgba(255,255,255,.07)', borderRadius: 1 }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Panel */}
        <div className="panel" style={panel}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f0e2c4', margin: '0 0 4px' }}>
            {step === 1 && 'Personal Information'}
            {step === 2 && 'Business Information'}
            {step === 3 && 'KYB Documents'}
            {step === 4 && 'Agent Contract'}
          </h2>
          <p style={{ fontSize: 12, color: 'rgba(245,240,232,.3)', marginBottom: 24 }}>Step {step} of {STEPS.length}</p>

          {step === 1 && <Step1 data={formData} onChange={updateField} onNext={() => setStep(2)} />}
          {step === 2 && <Step2 data={formData} onChange={updateField} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
          {step === 3 && <Step3 files={files} setFile={setFile} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
          {step === 4 && <Step4 data={formData} files={files} setFile={setFile} onBack={() => setStep(3)} onSubmit={submit} submitting={submitting} />}
        </div>
      </div>
    </div>
  );
}

// ─── Shared button styles ─────────────────────────────────────────────────────
const primaryBtn = {
  marginTop: 28, padding: '13px 24px', borderRadius: 10,
  background: 'linear-gradient(135deg,#c9a870,#d4af7a)',
  color: '#07111f', fontWeight: 700, fontSize: 14,
  border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  transition: 'opacity .15s',
};

const ghostBtn = {
  marginTop: 28, padding: '13px 20px', borderRadius: 10,
  border: '1.5px solid rgba(255,255,255,.12)', background: 'none',
  color: 'rgba(245,240,232,.6)', fontWeight: 600, fontSize: 14,
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
};

const pageWrap = {
  minHeight: '100vh', background: '#07111f',
  fontFamily: 'Inter, system-ui, sans-serif',
  padding: '32px 0',
};

const panel = {
  background: 'rgba(255,255,255,.03)',
  border: '1px solid rgba(255,255,255,.08)',
  borderRadius: 20,
  padding: '36px 40px',
};
