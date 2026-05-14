'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function DashboardLayout({ children, title = '' }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  // Keep sidebar collapsed by default on small screens
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 768) {
        setCollapsed(true);
      }
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#07111f' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #c9a870', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#07111f' }}>
      <style>{`
        /* ── Dark dashboard overrides ──────────────────────────── */
        .text-gray-900, .text-gray-800, .text-gray-700 { color: #f0e2c4 !important; }
        .text-gray-600, .text-gray-500 { color: rgba(245,240,232,.55) !important; }
        .text-gray-400, .text-gray-300 { color: rgba(245,240,232,.35) !important; }
        .bg-white { background: rgba(255,255,255,.05) !important; }
        .bg-gray-50, .bg-gray-100 { background: rgba(255,255,255,.04) !important; }
        .border-gray-100, .border-gray-200 { border-color: rgba(255,255,255,.07) !important; }
        .divide-gray-50 > * + * { border-color: rgba(255,255,255,.05) !important; }
        .hover\\:bg-gray-50:hover, .hover\\:bg-gray-100:hover { background: rgba(255,255,255,.06) !important; }
        .shadow-sm { box-shadow: none !important; }
        .bg-amber-50  { background: rgba(217,119,6,.08) !important; }
        .border-amber-200 { border-color: rgba(217,119,6,.2) !important; }
        .text-amber-800, .text-amber-700 { color: #fbbf24 !important; }
        .text-amber-600 { color: rgba(251,191,36,.7) !important; }
        .bg-green-100  { background: rgba(22,163,74,.12) !important; }
        .text-green-700 { color: #4ade80 !important; }
        .hover\\:bg-green-200:hover { background: rgba(22,163,74,.2) !important; }
        .bg-red-100   { background: rgba(220,38,38,.12) !important; }
        .text-red-700  { color: #f87171 !important; }
        .hover\\:bg-red-200:hover   { background: rgba(220,38,38,.2) !important; }
        .text-brand-600, .text-brand-700 { color: #c9a870 !important; }
        .bg-brand-600, .hover\\:bg-brand-700:hover { background: linear-gradient(135deg,#c9a870,#d4af7a) !important; color: #07111f !important; }
        .bg-brand-100  { background: rgba(201,168,112,.1) !important; }
        .bg-blue-50    { background: rgba(201,168,112,.1) !important; }
        .text-blue-600  { color: #60a5fa !important; }
        .font-mono     { font-family: 'Courier New', monospace; color: rgba(245,240,232,.7) !important; }
        table thead th { color: rgba(245,240,232,.4) !important; }
        table tbody tr:hover { background: rgba(255,255,255,.04) !important; }
        input, select, textarea {
          background: rgba(255,255,255,.05) !important;
          color: #f0e2c4 !important;
          border-color: rgba(255,255,255,.12) !important;
        }
        input::placeholder, textarea::placeholder { color: rgba(245,240,232,.3) !important; }
        label { color: rgba(245,240,232,.7) !important; }
      `}</style>
      <Sidebar
        role={user?.role}
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
      />

      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar
          user={user}
          title={title}
          onMenuToggle={() => setCollapsed((prev) => !prev)}
        />

        <main style={{ flex: 1, overflowY: 'auto', padding: 28, background: '#07111f' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
