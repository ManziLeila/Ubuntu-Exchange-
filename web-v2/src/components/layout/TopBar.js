'use client';

import { useState, useRef, useEffect } from 'react';
import { Menu, LogOut, User, Settings } from 'lucide-react';
import Link from 'next/link';
import NotificationBell from '../notifications/NotificationBell';
import { useAuth } from '../../contexts/AuthContext';

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
}

export default function TopBar({ user, onMenuToggle, title = '' }) {
  const { logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const displayName = user?.name || user?.email || 'User';

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: 60, padding: '0 20px',
      background: '#0a1628',
      borderBottom: '1px solid rgba(255,255,255,.07)',
      zIndex: 20, position: 'relative', flexShrink: 0,
    }}>
      {/* Hamburger */}
      <button
        onClick={onMenuToggle}
        aria-label="Toggle menu"
        style={{ padding: 8, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,.5)', display: 'flex', alignItems: 'center' }}
        onMouseOver={e => e.currentTarget.style.color = '#c9a870'}
        onMouseOut={e => e.currentTarget.style.color = 'rgba(245,240,232,.5)'}
      >
        <Menu size={20} />
      </button>

      {/* Page title */}
      {title && (
        <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: 14, fontWeight: 600, color: 'rgba(245,240,232,.8)' }}>
          {title}
        </span>
      )}

      {/* Right: notification bell + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <NotificationBell />

        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(p => !p)}
            aria-label="User menu"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 10, background: 'none', border: '1px solid rgba(255,255,255,.08)', cursor: 'pointer', transition: 'border-color .15s' }}
            onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(201,168,112,.4)'}
            onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)'}
          >
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#c9a870,#f0e2c4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#07111f' }}>
              {getInitials(displayName)}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(245,240,232,.8)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName.split(' ')[0]}
            </span>
          </button>

          {dropdownOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)',
              width: 210, background: '#0f1e38', border: '1px solid rgba(255,255,255,.1)',
              borderRadius: 14, boxShadow: '0 16px 48px rgba(0,0,0,.5)',
              zIndex: 50, overflow: 'hidden',
            }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#f0e2c4', margin: 0, marginBottom: 2 }}>{displayName}</p>
                {user?.email && <p style={{ fontSize: 11, color: 'rgba(245,240,232,.4)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</p>}
              </div>

              {[
                { href: '/profile', icon: User, label: 'Profile' },
                { href: '/settings', icon: Settings, label: 'Settings' },
              ].map(({ href, icon: Icon, label }) => (
                <Link key={href} href={href} onClick={() => setDropdownOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', fontSize: 13, color: 'rgba(245,240,232,.65)', textDecoration: 'none', transition: 'background .1s' }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,.05)'}
                  onMouseOut={e => e.currentTarget.style.background = 'none'}
                >
                  <Icon size={14} color="rgba(201,168,112,.7)" />
                  {label}
                </Link>
              ))}

              <div style={{ borderTop: '1px solid rgba(255,255,255,.07)', marginTop: 2 }} />
              <button
                onClick={() => { setDropdownOpen(false); logout(); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', fontSize: 13, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background .1s' }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,.06)'}
                onMouseOut={e => e.currentTarget.style.background = 'none'}
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
