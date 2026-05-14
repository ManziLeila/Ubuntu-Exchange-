'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';

const schema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const ROLE_DASHBOARDS = {
  client:             '/client/dashboard',
  agent:              '/agent/dashboard',
  admin:              '/admin/dashboard',
  compliance_officer: '/compliance/dashboard',
  super_admin:        '/super/dashboard',
};

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ email, password }) => {
    try {
      const user = await login(email, password);
      toast.success('Welcome back!');
      router.push(ROLE_DASHBOARDS[user.role] ?? '/');
    } catch (err) {
      toast.error(err?.response?.data?.error ?? err?.response?.data?.message ?? 'Login failed. Check your credentials.');
    }
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Inter, system-ui, sans-serif; }
        .field input { width: 100%; padding: 13px 16px; border-radius: 10px; border: 1.5px solid rgba(255,255,255,.1); background: rgba(255,255,255,.05); color: #f0e2c4; font-size: 14px; outline: none; transition: border-color .15s; }
        .field input::placeholder { color: rgba(245,240,232,.3); }
        .field input:focus { border-color: rgba(201,168,112,.5); }
        .field input.err { border-color: rgba(239,68,68,.5); }
        .social-btn:hover { background: rgba(255,255,255,.06) !important; }
        .submit-btn:hover { opacity: .88 }
        .link-gold { color: #c9a870; text-decoration: none; }
        .link-gold:hover { text-decoration: underline; }
        @keyframes fadein { from { opacity:0; transform:translateX(12px) } to { opacity:1; transform:translateX(0) } }
        .form-panel { animation: fadein .4s ease }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh', background: '#07111f' }}>

        {/* ── LEFT PANEL ── */}
        <div style={{ flex: '0 0 44%', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 40, overflow: 'hidden' }}>
          {/* Background gradient */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #0f1e38 0%, #07111f 40%, #1a1200 100%)' }} />
          <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,112,.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '10%', right: '-10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,112,.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

          {/* Brand */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#c9a870,#f0e2c4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: '#07111f' }}>UI</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f0e2c4', lineHeight: 1.2 }}>Ubuntu International</div>
              <div style={{ fontSize: 10, color: '#c9a870' }}>Exchange Ltd</div>
            </div>
          </div>

          {/* Middle content */}
          <div style={{ position: 'relative' }}>
            {/* Globe orb */}
            <div style={{ width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(ellipse at 35% 35%, rgba(240,226,196,.2) 0%, rgba(201,168,112,.25) 35%, rgba(120,80,10,.15) 60%, transparent 80%)', boxShadow: '0 0 80px 20px rgba(201,168,112,.08)', margin: '0 auto 36px' }} />
            <h2 style={{ fontSize: 32, fontWeight: 800, color: '#f0e2c4', lineHeight: 1.15, marginBottom: 14 }}>
              Move Money<br />Across Africa
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(245,240,232,.45)', lineHeight: 1.7, maxWidth: 300 }}>
              Fast, affordable remittances from Rwanda to the world. Real-time rates, zero hidden fees.
            </p>

            {/* Stats pills */}
            <div style={{ display: 'flex', gap: 10, marginTop: 28, flexWrap: 'wrap' }}>
              {['99.2% Success', '< 2 min delivery', 'KYC Regulated'].map(s => (
                <span key={s} style={{ padding: '5px 12px', borderRadius: 100, border: '1px solid rgba(201,168,112,.25)', background: 'rgba(201,168,112,.07)', fontSize: 11, fontWeight: 600, color: '#c9a870' }}>{s}</span>
              ))}
            </div>
          </div>

          {/* Footer note */}
          <p style={{ position: 'relative', fontSize: 11, color: 'rgba(245,240,232,.25)' }}>
            © {new Date().getFullYear()} Ubuntu International Exchange Ltd
          </p>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="form-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 56px', overflowY: 'auto' }}>

          {/* Back link */}
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(245,240,232,.45)', textDecoration: 'none', marginBottom: 40 }}>
            <ArrowLeft size={14} /> Back to website
          </Link>

          <div style={{ maxWidth: 420 }}>
            <h1 style={{ fontSize: 36, fontWeight: 800, color: '#f0e2c4', marginBottom: 8, lineHeight: 1.1 }}>Welcome back</h1>
            <p style={{ fontSize: 14, color: 'rgba(245,240,232,.45)', marginBottom: 32 }}>
              Don&apos;t have an account?{' '}
              <Link href="/register" className="link-gold">Sign up</Link>
            </p>

            {/* Google SSO */}
            <button
              type="button"
              className="social-btn"
              onClick={() => toast('Google login coming soon', { icon: '🔐' })}
              style={{ width: '100%', padding: '12px 20px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.03)', color: '#f0e2c4', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', marginBottom: 24, transition: 'background .15s' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.08)' }} />
              <span style={{ fontSize: 12, color: 'rgba(245,240,232,.3)' }}>or sign in with email</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.08)' }} />
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="field" style={{ marginBottom: 16 }}>
                <input {...register('email')} type="email" placeholder="Email address" autoComplete="email" className={errors.email ? 'err' : ''} />
                {errors.email && <p style={{ color: '#f87171', fontSize: 11, marginTop: 5 }}>{errors.email.message}</p>}
              </div>

              <div className="field" style={{ marginBottom: 8, position: 'relative' }}>
                <input {...register('password')} type={showPw ? 'text' : 'password'} placeholder="Password" autoComplete="current-password" className={errors.password ? 'err' : ''} style={{ paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,.4)', padding: 0 }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                {errors.password && <p style={{ color: '#f87171', fontSize: 11, marginTop: 5 }}>{errors.password.message}</p>}
              </div>

              <div style={{ textAlign: 'right', marginBottom: 24 }}>
                <Link href="/forgot-password" className="link-gold" style={{ fontSize: 12 }}>Forgot password?</Link>
              </div>

              <button type="submit" disabled={isSubmitting} className="submit-btn" style={{ width: '100%', padding: '14px', borderRadius: 10, background: 'linear-gradient(135deg,#c9a870,#d4af7a)', color: '#07111f', fontWeight: 700, fontSize: 15, border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? .7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'opacity .15s' }}>
                {isSubmitting ? <><span style={{ width: 16, height: 16, border: '2px solid #07111f', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} />Signing in…</> : 'Sign in'}
              </button>
            </form>

            {/* Demo hint */}
            <div style={{ marginTop: 28, padding: '14px 16px', borderRadius: 10, border: '1px solid rgba(201,168,112,.15)', background: 'rgba(201,168,112,.05)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#c9a870', marginBottom: 6 }}>Demo credentials</p>
              <div style={{ fontSize: 11, color: 'rgba(245,240,232,.4)', lineHeight: 1.8, fontFamily: 'monospace' }}>
                {[['client','Client@12345'],['agent','Agent@12345'],['admin','Admin@12345'],['compliance','Comply@12345'],['superadmin','Super@12345']].map(([u,p]) => (
                  <div key={u}>{u}@demo.com / {p}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </>
  );
}
