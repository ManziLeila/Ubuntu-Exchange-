'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Send, ArrowLeftRight, ShieldCheck, Users, TrendingUp,
  UserCheck, Wallet, DollarSign, BarChart2, FileText, AlertTriangle,
  Settings, ClipboardList, Flag, BookOpen, SlidersHorizontal, Gauge,
  Activity, ChevronLeft, ChevronRight, Ban,
} from 'lucide-react';
import clsx from 'clsx';

const NAV_ITEMS = {
  client: [
    { label: 'Dashboard',     href: '/client/dashboard',     icon: LayoutDashboard },
    { label: 'Send Money',    href: '/client/send',          icon: Send },
    { label: 'Transfers',     href: '/client/transfers',     icon: ArrowLeftRight },
    { label: 'KYC',           href: '/client/kyc',           icon: ShieldCheck },
    { label: 'Beneficiaries', href: '/client/beneficiaries', icon: Users },
    { label: 'Rates',         href: '/client/rates',         icon: TrendingUp },
  ],
  agent: [
    { label: 'Dashboard',   href: '/agent/dashboard',   icon: LayoutDashboard },
    { label: 'Clients',     href: '/agent/clients',     icon: UserCheck },
    { label: 'Transfers',   href: '/agent/transfers',   icon: ArrowLeftRight },
    { label: 'Commissions', href: '/agent/commissions', icon: DollarSign },
    { label: 'Float',       href: '/agent/float',       icon: Wallet },
  ],
  admin: [
    { label: 'Dashboard',  href: '/admin/dashboard',  icon: LayoutDashboard },
    { label: 'Users',      href: '/admin/users',      icon: Users },
    { label: 'KYC',        href: '/admin/kyc',        icon: ShieldCheck },
    { label: 'Transfers',  href: '/admin/transfers',  icon: ArrowLeftRight },
    { label: 'Fraud',      href: '/admin/fraud',      icon: AlertTriangle },
    { label: 'Analytics',  href: '/admin/analytics',  icon: BarChart2 },
  ],
  compliance_officer: [
    { label: 'Dashboard',   href: '/compliance/dashboard',   icon: LayoutDashboard },
    { label: 'KYC Review',  href: '/compliance/kyc-review',  icon: ShieldCheck },
    { label: 'AML',         href: '/compliance/aml',         icon: Activity },
    { label: 'Flagged',     href: '/compliance/flagged',     icon: Flag },
    { label: 'Audit Log',   href: '/compliance/audit',       icon: ClipboardList },
    { label: 'Reports',     href: '/compliance/reports',     icon: FileText },
  ],
  super_admin: [
    { label: 'Dashboard', href: '/super/dashboard', icon: LayoutDashboard },
    { label: 'Config',    href: '/super/config',    icon: Settings },
    { label: 'Limits',    href: '/super/limits',    icon: SlidersHorizontal },
    { label: 'Audit',     href: '/super/audit',     icon: BookOpen },
    { label: 'Users',     href: '/super/users',     icon: Users },
    { label: 'Overview',  href: '/super/overview',  icon: Gauge },
  ],
};

export default function Sidebar({ role = 'client', collapsed = false, onToggle }) {
  const pathname = usePathname();
  const items = NAV_ITEMS[role] || NAV_ITEMS.client;

  return (
    <aside
      className={clsx(
        'relative flex flex-col h-full transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64'
      )}
      style={{ background: 'linear-gradient(180deg, #0a1628 0%, #0f1e38 100%)' }}
    >
      {/* Logo */}
      <div
        className={clsx(
          'flex items-center gap-3 px-4 py-5 border-b border-white/10',
          collapsed && 'justify-center px-0'
        )}
      >
        <div
          className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs tracking-wide text-navy-900"
          style={{ background: 'linear-gradient(135deg, #c9a870, #f0e2c4)' }}
        >
          UI
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-gold-light leading-tight truncate">Ubuntu Intl.</p>
            <p className="text-[10px] text-gold-DEFAULT/70 truncate">Exchange</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-2">
        {items.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                collapsed && 'justify-center px-0',
                isActive
                  ? 'text-navy-900 shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/8'
              )}
              style={isActive ? { background: 'linear-gradient(135deg, #c9a870, #d4af7a)', color: '#0a1628' } : {}}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Toggle */}
      <button
        onClick={onToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute -right-3 top-[72px] z-10 flex h-6 w-6 items-center justify-center rounded-full shadow transition-colors"
        style={{ background: '#c9a870', color: '#0a1628' }}
      >
        {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>
    </aside>
  );
}
