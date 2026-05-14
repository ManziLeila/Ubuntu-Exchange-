'use client';
import Link from 'next/link';

const COLS = [
  {
    title: 'Send Money',
    links: [
      { label: 'How It Works',  href: '#' },
      { label: 'Live Rates',    href: '/login' },
      { label: 'Corridors',     href: '#' },
      { label: 'Mobile Money',  href: '#' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Help Center',   href: '#' },
      { label: 'Contact Us',    href: '#' },
      { label: 'FAQ',           href: '#' },
      { label: 'Agent Locator', href: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us',       href: '#' },
      { label: 'Compliance',     href: '#' },
      { label: 'Careers',        href: '#' },
      { label: 'Become an Agent', href: '/apply-agent' },
    ],
  },
];

export default function Footer() {
  return (
    <footer style={{ background: '#07111f', borderTop: '1px solid rgba(255,255,255,.07)', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 32px 32px' }}>
        {/* Top row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 40, marginBottom: 48 }}>
          {/* Brand col */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#c9a870,#f0e2c4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: '#07111f', flexShrink: 0 }}>UI</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f0e2c4', lineHeight: 1.2 }}>Ubuntu International</div>
                <div style={{ fontSize: 10, color: '#c9a870', letterSpacing: '.04em' }}>Exchange Ltd</div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(245,240,232,.4)', lineHeight: 1.7, maxWidth: 260, margin: '0 0 20px' }}>
              Empowering the Rwandan diaspora with fast, secure, and affordable international money transfers.
            </p>
            {/* Socials */}
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { label: 'X', path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.26 5.632L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z' },
                { label: 'In', path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
                { label: 'Git', path: 'M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z' },
              ].map(({ label, path }) => (
                <a key={label} href="#" style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color .15s' }}
                  onMouseOver={e => e.currentTarget.style.borderColor = '#c9a870'}
                  onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(245,240,232,.45)"><path d={path} /></svg>
                </a>
              ))}
            </div>
          </div>

          {/* Nav columns */}
          {COLS.map(({ title, links }) => (
            <div key={title}>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: 'rgba(245,240,232,.9)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 16 }}>{title}</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} style={{ fontSize: 13.5, color: 'rgba(245,240,232,.4)', textDecoration: 'none', transition: 'color .15s' }}
                      onMouseOver={e => e.currentTarget.style.color = '#c9a870'}
                      onMouseOut={e => e.currentTarget.style.color = 'rgba(245,240,232,.4)'}
                    >{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,.07)', paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: 12.5, color: 'rgba(245,240,232,.3)', margin: 0 }}>
            © {new Date().getFullYear()} Ubuntu International Exchange Ltd. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: 24 }}>
            {['Privacy Policy', 'Terms of Service', 'Compliance Notice'].map(l => (
              <a key={l} href="#" style={{ fontSize: 12.5, color: 'rgba(245,240,232,.3)', textDecoration: 'none', transition: 'color .15s' }}
                onMouseOver={e => e.currentTarget.style.color = '#c9a870'}
                onMouseOut={e => e.currentTarget.style.color = 'rgba(245,240,232,.3)'}
              >{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
