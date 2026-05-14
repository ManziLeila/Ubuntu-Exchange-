'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Globe2, ShieldCheck, Zap, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Footer from '../components/layout/Footer';

const ROLE_DASHBOARDS = {
  client:             '/client/dashboard',
  agent:              '/agent/dashboard',
  admin:              '/admin/dashboard',
  compliance_officer: '/compliance/dashboard',
  super_admin:        '/super/dashboard',
};

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted || isLoading || !user) return;
    router.replace(ROLE_DASHBOARDS[user.role] ?? '/login');
  }, [user, isLoading, mounted, router]);

  if (!mounted || isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#07111f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #c9a870', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }
  if (user) return null;

  return (
    <>
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg) } }
        @keyframes float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-18px) } }
        @keyframes pulse-glow {
          0%,100% { opacity: .55; transform: scale(1) }
          50%      { opacity: .85; transform: scale(1.06) }
        }
        @keyframes fadein { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        .hero-title  { animation: fadein .9s ease both }
        .hero-sub    { animation: fadein .9s .2s ease both }
        .hero-cta    { animation: fadein .9s .35s ease both }
        .card-float  { animation: float 5s ease-in-out infinite }
        .card-float2 { animation: float 6s 1.2s ease-in-out infinite }
        .orb         { animation: pulse-glow 5s ease-in-out infinite }
        .nav-link:hover { color: #c9a870 }
        .btn-primary:hover { opacity: .88 }
        .btn-outline:hover { background: rgba(201,168,112,.08) }
        .stat-card:hover { border-color: rgba(201,168,112,.45) !important; transform: translateY(-3px) }
        .stat-card { transition: all .25s ease }
        .feature-card:hover { border-color: rgba(201,168,112,.35) !important }
        .feature-card { transition: border-color .2s ease }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#07111f', color: '#f5f0e8', fontFamily: 'Inter, system-ui, sans-serif', overflowX: 'hidden' }}>

        {/* ── NAV ── */}
        <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '0 32px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(7,17,31,.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#c9a870,#f0e2c4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#07111f' }}>UI</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f0e2c4', lineHeight: 1.2 }}>Ubuntu International</div>
              <div style={{ fontSize: 10, color: '#c9a870', letterSpacing: '.04em' }}>Exchange Ltd</div>
            </div>
          </div>

          {/* Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
            {['About', 'Corridors', 'Rates', 'Contact'].map(l => (
              <a key={l} href="#" className="nav-link" style={{ fontSize: 14, color: 'rgba(245,240,232,.6)', textDecoration: 'none', fontWeight: 500, transition: 'color .15s' }}>{l}</a>
            ))}
          </div>

          {/* Auth */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/apply-agent" className="nav-link" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(245,240,232,.55)', textDecoration: 'none', padding: '8px 14px' }}>Become an Agent</Link>
            <Link href="/login" style={{ fontSize: 14, fontWeight: 600, color: '#c9a870', textDecoration: 'none', padding: '8px 18px' }}>Login</Link>
            <Link href="/register" className="btn-primary" style={{ fontSize: 14, fontWeight: 600, padding: '9px 22px', borderRadius: 100, background: 'linear-gradient(135deg,#c9a870,#d4af7a)', color: '#07111f', textDecoration: 'none', transition: 'opacity .15s' }}>Sign up</Link>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', paddingTop: 68, overflow: 'hidden' }}>

          {/* Background glow blobs */}
          <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,112,.13) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '20%', left: '20%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(100,140,220,.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

          {/* Central orb */}
          <div className="orb" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(ellipse at 35% 35%, rgba(240,226,196,.18) 0%, rgba(201,168,112,.22) 30%, rgba(100,80,20,.18) 55%, rgba(10,22,40,.05) 75%, transparent 100%)', boxShadow: '0 0 120px 40px rgba(201,168,112,.08), inset 0 0 80px 20px rgba(201,168,112,.06)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 360, height: 360, borderRadius: '50%', border: '1px solid rgba(201,168,112,.15)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 500, borderRadius: '50%', border: '1px solid rgba(201,168,112,.07)', pointerEvents: 'none' }} />

          {/* Content */}
          <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', maxWidth: 760, padding: '0 24px' }}>
            <div className="hero-title" style={{ marginBottom: 8 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 16px', borderRadius: 100, border: '1px solid rgba(201,168,112,.3)', background: 'rgba(201,168,112,.07)', fontSize: 12, fontWeight: 600, color: '#c9a870', marginBottom: 28 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#c9a870', animation: 'pulse-glow 2s infinite' }} />
                Empowering Diaspora · Unity in Every Transfer
              </div>
              <h1 style={{ fontSize: 'clamp(42px, 7vw, 80px)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-.02em', color: '#f0e2c4', margin: 0 }}>
                Send Money Home<br />
                <span style={{ background: 'linear-gradient(135deg,#c9a870 20%,#f0e2c4 60%,#c9a870 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  Fast &amp; Secure
                </span>
              </h1>
            </div>

            <p className="hero-sub" style={{ fontSize: 18, color: 'rgba(245,240,232,.55)', maxWidth: 520, margin: '22px auto 36px', lineHeight: 1.65 }}>
              Rwanda&rsquo;s trusted international remittance platform. Competitive rates, real-time tracking, fully regulated.
            </p>

            <div className="hero-cta" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
              <Link href="/register" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 30px', borderRadius: 100, background: 'linear-gradient(135deg,#c9a870,#d4af7a)', color: '#07111f', fontWeight: 700, fontSize: 15, textDecoration: 'none', transition: 'opacity .15s' }}>
                Send Money Now <ArrowRight size={17} />
              </Link>
              <Link href="/login" className="btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px', borderRadius: 100, border: '1.5px solid rgba(201,168,112,.35)', color: '#f0e2c4', fontWeight: 600, fontSize: 15, textDecoration: 'none', transition: 'background .15s' }}>
                Sign In
              </Link>
            </div>
          </div>

          {/* Floating stat card — LEFT */}
          <div className="card-float stat-card" style={{ position: 'absolute', left: '6%', top: '38%', background: 'rgba(10,22,40,.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(201,168,112,.2)', borderRadius: 18, padding: '18px 22px', minWidth: 185, cursor: 'default' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: 'rgba(245,240,232,.45)', fontWeight: 500 }}>Transfer Volume</span>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(201,168,112,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowUpRight size={14} style={{ color: '#c9a870' }} />
              </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#f0e2c4', letterSpacing: '-.02em' }}>₣2.4B+</div>
            <div style={{ fontSize: 11, color: '#c9a870', marginTop: 4, fontWeight: 500 }}>Processed annually</div>
            <div style={{ marginTop: 12, height: 3, borderRadius: 2, background: 'rgba(255,255,255,.08)' }}>
              <div style={{ width: '72%', height: '100%', borderRadius: 2, background: 'linear-gradient(90deg,#c9a870,#f0e2c4)' }} />
            </div>
          </div>

          {/* Floating stat card — RIGHT */}
          <div className="card-float2 stat-card" style={{ position: 'absolute', right: '6%', top: '45%', background: 'rgba(10,22,40,.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(201,168,112,.2)', borderRadius: 18, padding: '18px 22px', minWidth: 170, cursor: 'default' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: 'rgba(245,240,232,.45)', fontWeight: 500 }}>Success Rate</span>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(201,168,112,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowUpRight size={14} style={{ color: '#c9a870' }} />
              </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#f0e2c4', letterSpacing: '-.02em' }}>99.2%</div>
            <div style={{ fontSize: 11, color: '#c9a870', marginTop: 4, fontWeight: 500 }}>Transaction success</div>
            <div style={{ marginTop: 12, height: 3, borderRadius: 2, background: 'rgba(255,255,255,.08)' }}>
              <div style={{ width: '99%', height: '100%', borderRadius: 2, background: 'linear-gradient(90deg,#c9a870,#f0e2c4)' }} />
            </div>
          </div>

          {/* Corridor pills */}
          <div style={{ position: 'absolute', bottom: '10%', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[['RWF','AED'],['RWF','GHS'],['RWF','KES'],['RWF','UGX']].map(([f,t]) => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 100, border: '1px solid rgba(201,168,112,.25)', background: 'rgba(10,22,40,.7)', backdropFilter: 'blur(8px)', fontSize: 12, fontWeight: 600, color: '#c9a870' }}>
                {f} <ArrowRight size={11} style={{ opacity: .6 }} /> {t}
              </div>
            ))}
          </div>
        </section>

        {/* ── STATS ROW ── */}
        <section style={{ borderTop: '1px solid rgba(255,255,255,.06)', borderBottom: '1px solid rgba(255,255,255,.06)', padding: '40px 32px', display: 'flex', justifyContent: 'center', gap: 0, background: 'rgba(255,255,255,.02)' }}>
          <div style={{ maxWidth: 900, width: '100%', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0 }}>
            {[
              { val: '50K+',   label: 'Active Customers' },
              { val: '12',     label: 'Countries Served' },
              { val: '< 2min', label: 'Avg. Delivery Time' },
              { val: 'KYC/AML',label: 'Fully Compliant' },
            ].map(({ val, label }, i) => (
              <div key={label} style={{ textAlign: 'center', padding: '8px 24px', borderRight: i < 3 ? '1px solid rgba(255,255,255,.06)' : 'none' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#c9a870', letterSpacing: '-.02em' }}>{val}</div>
                <div style={{ fontSize: 12, color: 'rgba(245,240,232,.45)', marginTop: 4, fontWeight: 500 }}>{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '96px 32px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#c9a870', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 14 }}>Why Choose Us</div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, color: '#f0e2c4', margin: 0, lineHeight: 1.15 }}>Built for the African diaspora</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px,1fr))', gap: 20 }}>
            {[
              { icon: Zap,        title: 'Instant Delivery',   desc: 'Real-time mobile money payouts to MTN, Airtel and major banks across Africa.' },
              { icon: ShieldCheck,title: 'Regulated & Secure',  desc: 'Licensed operator with full KYC/AML compliance and end-to-end encryption.' },
              { icon: Globe2,     title: 'Best Exchange Rates', desc: 'Mid-market rates with transparent fees — no hidden costs, ever.' },
              { icon: Users,      title: 'Agent Network',       desc: 'Hundreds of verified cash agents across Rwanda for in-person support.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="feature-card" style={{ padding: '28px 26px', borderRadius: 20, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.03)' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(201,168,112,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                  <Icon size={20} style={{ color: '#c9a870' }} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f0e2c4', margin: '0 0 10px' }}>{title}</h3>
                <p style={{ fontSize: 13.5, color: 'rgba(245,240,232,.5)', lineHeight: 1.65, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA BANNER ── */}
        <section style={{ margin: '0 32px 96px', borderRadius: 24, padding: '64px 40px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(201,168,112,.1) 0%, rgba(201,168,112,.04) 100%)', border: '1px solid rgba(201,168,112,.2)' }}>
          <h2 style={{ fontSize: 'clamp(24px,4vw,42px)', fontWeight: 800, color: '#f0e2c4', margin: '0 0 16px', lineHeight: 1.15 }}>
            Start sending money today
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(245,240,232,.5)', marginBottom: 36, maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}>
            Join thousands of Rwandans who trust Ubuntu International Exchange every day.
          </p>
          <Link href="/register" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '15px 34px', borderRadius: 100, background: 'linear-gradient(135deg,#c9a870,#d4af7a)', color: '#07111f', fontWeight: 700, fontSize: 16, textDecoration: 'none', transition: 'opacity .15s' }}>
            Create Free Account <ArrowRight size={18} />
          </Link>
        </section>

        <Footer />

      </div>
    </>
  );
}
