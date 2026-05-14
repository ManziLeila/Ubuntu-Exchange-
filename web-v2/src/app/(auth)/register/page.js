'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, ArrowLeft, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';

const schema = z.object({
  name:     z.string().min(2, 'Name must be at least 2 characters'),
  email:    z.string().email('Invalid email address'),
  msisdn:   z.string().min(9, 'Enter a valid phone number'),
  country:  z.string().length(2, 'Select a country'),
  password: z.string().min(8, 'At least 8 characters')
            .regex(/[A-Z]/, 'Must contain uppercase letter')
            .regex(/[0-9]/, 'Must contain a number'),
  confirm:  z.string(),
}).refine(d => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });

const COUNTRIES = [
  { code: 'RW', name: 'Rwanda' },
  { code: 'GH', name: 'Ghana' },
  { code: 'UG', name: 'Uganda' },
  { code: 'KE', name: 'Kenya' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'AE', name: 'UAE' },
];

const PERKS = [
  'Send money across 20+ African corridors',
  'Real-time exchange rates, zero hidden fees',
  'KYC-regulated and fully compliant',
  'Delivery under 2 minutes via Mobile Money',
];

export default function RegisterPage() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      await api.post('/api/v1/auth/register', {
        name:     data.name,
        email:    data.email,
        msisdn:   data.msisdn,
        country:  data.country,
        password: data.password,
      });
      toast.success('Account created! Please sign in.');
      router.push('/login');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Registration failed.');
    }
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Inter, system-ui, sans-serif; }
        .field input, .field select { width: 100%; padding: 12px 16px; border-radius: 10px; border: 1.5px solid rgba(255,255,255,.1); background: rgba(255,255,255,.05); color: #f0e2c4; font-size: 14px; outline: none; transition: border-color .15s; appearance: none; -webkit-appearance: none; }
        .field select option { background: #07111f; color: #f0e2c4; }
        .field input::placeholder { color: rgba(245,240,232,.3); }
        .field input:focus, .field select:focus { border-color: rgba(201,168,112,.5); }
        .field input.err, .field select.err { border-color: rgba(239,68,68,.5); }
        .submit-btn:hover { opacity: .88 }
        .link-gold { color: #c9a870; text-decoration: none; }
        .link-gold:hover { text-decoration: underline; }
        .social-btn:hover { background: rgba(255,255,255,.06) !important; }
        @keyframes fadein { from { opacity:0; transform:translateX(12px) } to { opacity:1; transform:translateX(0) } }
        .form-panel { animation: fadein .4s ease }
        @keyframes spin { to { transform: rotate(360deg) } }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh', background: '#07111f' }}>

        {/* ── LEFT PANEL ── */}
        <div style={{ flex: '0 0 44%', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 40, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #0f1e38 0%, #07111f 40%, #1a1200 100%)' }} />
          <div style={{ position: 'absolute', top: '35%', left: '50%', transform: 'translate(-50%,-50%)', width: 460, height: 460, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,112,.13) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '8%', right: '-8%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,112,.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

          {/* Brand */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#c9a870,#f0e2c4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: '#07111f' }}>UI</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f0e2c4', lineHeight: 1.2 }}>Ubuntu International</div>
              <div style={{ fontSize: 10, color: '#c9a870' }}>Exchange Ltd</div>
            </div>
          </div>

          {/* Middle */}
          <div style={{ position: 'relative' }}>
            <div style={{ width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(ellipse at 35% 35%, rgba(240,226,196,.2) 0%, rgba(201,168,112,.25) 35%, rgba(120,80,10,.15) 60%, transparent 80%)', boxShadow: '0 0 60px 15px rgba(201,168,112,.08)', margin: '0 auto 32px' }} />
            <h2 style={{ fontSize: 30, fontWeight: 800, color: '#f0e2c4', lineHeight: 1.15, marginBottom: 12 }}>
              Join Thousands<br />Sending Home
            </h2>
            <p style={{ fontSize: 13.5, color: 'rgba(245,240,232,.45)', lineHeight: 1.7, maxWidth: 300, marginBottom: 28 }}>
              Open your free account in minutes. No paperwork, no branches.
            </p>

            {/* Perks */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {PERKS.map(p => (
                <div key={p} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(201,168,112,.15)', border: '1px solid rgba(201,168,112,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <Check size={10} color="#c9a870" strokeWidth={3} />
                  </div>
                  <span style={{ fontSize: 12.5, color: 'rgba(245,240,232,.55)', lineHeight: 1.5 }}>{p}</span>
                </div>
              ))}
            </div>
          </div>

          <p style={{ position: 'relative', fontSize: 11, color: 'rgba(245,240,232,.25)' }}>
            © {new Date().getFullYear()} Ubuntu International Exchange Ltd
          </p>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="form-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 56px', overflowY: 'auto' }}>

          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(245,240,232,.45)', textDecoration: 'none', marginBottom: 32 }}>
            <ArrowLeft size={14} /> Back to website
          </Link>

          <div style={{ maxWidth: 440 }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: '#f0e2c4', marginBottom: 6, lineHeight: 1.1 }}>Create account</h1>
            <p style={{ fontSize: 14, color: 'rgba(245,240,232,.45)', marginBottom: 28 }}>
              Already have an account?{' '}
              <Link href="/login" className="link-gold">Sign in</Link>
            </p>

            {/* Google SSO */}
            <button
              type="button"
              className="social-btn"
              onClick={() => toast('Google sign-up coming soon', { icon: '🔐' })}
              style={{ width: '100%', padding: '12px 20px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.03)', color: '#f0e2c4', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', marginBottom: 22, transition: 'background .15s' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.08)' }} />
              <span style={{ fontSize: 12, color: 'rgba(245,240,232,.3)' }}>or sign up with email</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.08)' }} />
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              {/* Name */}
              <div className="field" style={{ marginBottom: 12 }}>
                <input {...register('name')} type="text" placeholder="Full name" autoComplete="name" className={errors.name ? 'err' : ''} />
                {errors.name && <p style={{ color: '#f87171', fontSize: 11, marginTop: 4 }}>{errors.name.message}</p>}
              </div>

              {/* Email */}
              <div className="field" style={{ marginBottom: 12 }}>
                <input {...register('email')} type="email" placeholder="Email address" autoComplete="email" className={errors.email ? 'err' : ''} />
                {errors.email && <p style={{ color: '#f87171', fontSize: 11, marginTop: 4 }}>{errors.email.message}</p>}
              </div>

              {/* Phone + Country */}
              <div className="grid2" style={{ marginBottom: 12 }}>
                <div className="field">
                  <input {...register('msisdn')} type="tel" placeholder="Phone (+250...)" autoComplete="tel" className={errors.msisdn ? 'err' : ''} />
                  {errors.msisdn && <p style={{ color: '#f87171', fontSize: 11, marginTop: 4 }}>{errors.msisdn.message}</p>}
                </div>
                <div className="field">
                  <select {...register('country')} className={errors.country ? 'err' : ''} defaultValue="">
                    <option value="" disabled>Country</option>
                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                  {errors.country && <p style={{ color: '#f87171', fontSize: 11, marginTop: 4 }}>{errors.country.message}</p>}
                </div>
              </div>

              {/* Password */}
              <div className="field" style={{ marginBottom: 12, position: 'relative' }}>
                <input {...register('password')} type={showPw ? 'text' : 'password'} placeholder="Password (min 8 chars)" autoComplete="new-password" className={errors.password ? 'err' : ''} style={{ paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,.4)', padding: 0 }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                {errors.password && <p style={{ color: '#f87171', fontSize: 11, marginTop: 4 }}>{errors.password.message}</p>}
              </div>

              {/* Confirm */}
              <div className="field" style={{ marginBottom: 22 }}>
                <input {...register('confirm')} type={showPw ? 'text' : 'password'} placeholder="Confirm password" autoComplete="new-password" className={errors.confirm ? 'err' : ''} />
                {errors.confirm && <p style={{ color: '#f87171', fontSize: 11, marginTop: 4 }}>{errors.confirm.message}</p>}
              </div>

              <button type="submit" disabled={isSubmitting} className="submit-btn" style={{ width: '100%', padding: '14px', borderRadius: 10, background: 'linear-gradient(135deg,#c9a870,#d4af7a)', color: '#07111f', fontWeight: 700, fontSize: 15, border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? .7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'opacity .15s' }}>
                {isSubmitting ? <><span style={{ width: 16, height: 16, border: '2px solid #07111f', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} />Creating account…</> : 'Create account'}
              </button>

              <p style={{ fontSize: 11, color: 'rgba(245,240,232,.3)', textAlign: 'center', marginTop: 16, lineHeight: 1.6 }}>
                By creating an account you agree to our{' '}
                <a href="#" className="link-gold">Terms of Service</a> and{' '}
                <a href="#" className="link-gold">Privacy Policy</a>.
              </p>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
