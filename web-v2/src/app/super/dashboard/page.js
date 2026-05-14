'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Send, DollarSign, Settings, AlertTriangle, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { api } from '../../../lib/api';
import StatCard from '../../../components/ui/StatCard';
import Spinner from '../../../components/ui/Spinner';

export default function SuperDashboardPage() {
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/v1/super/platform-stats').then(r => setStats(r.data.data ?? r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;

  const quickLinks = [
    { href:'/super/config',   label:'System Config',     icon: Settings,    desc:'Edit platform settings' },
    { href:'/super/users',    label:'All Users',         icon: Users,       desc:'Manage users & roles' },
    { href:'/super/limits',   label:'Transaction Limits',icon: DollarSign,  desc:'Set limits & fees' },
    { href:'/super/audit',    label:'Audit Log',         icon: ShieldCheck, desc:'Full platform audit' },
    { href:'/super/overview', label:'Platform Overview', icon: ArrowUpRight,desc:'Health & status' },
    { href:'/admin/fraud',    label:'Fraud Alerts',      icon: AlertTriangle,desc:'Open fraud cases' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Super Admin</h1>
        <p className="text-sm text-gray-500 mt-0.5">Full platform control and visibility</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users"        value={stats?.totalUsers ?? '—'}     icon={Users} />
        <StatCard label="Total Transfers"    value={stats?.totalTransfers ?? '—'} icon={Send} />
        <StatCard label="Platform Volume"    value={stats?.totalVolume ? `${Number(stats.totalVolume).toLocaleString()} RWF` : '—'} icon={DollarSign} />
        <StatCard label="Open Fraud Alerts"  value={stats?.openFraudAlerts ?? '—'} icon={AlertTriangle} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickLinks.map(({ href, label, icon: Icon, desc }) => (
          <Link key={href} href={href}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-brand-300 hover:shadow-md transition group">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-brand-100 rounded-lg flex items-center justify-center group-hover:bg-brand-200 transition">
                <Icon className="w-5 h-5 text-brand-600" />
              </div>
              <p className="font-semibold text-gray-900">{label}</p>
            </div>
            <p className="text-sm text-gray-500">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
