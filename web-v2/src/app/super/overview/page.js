'use client';
import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { api } from '../../../lib/api';
import StatCard from '../../../components/ui/StatCard';
import Spinner from '../../../components/ui/Spinner';
import { Users, Send, DollarSign, ShieldCheck, AlertTriangle } from 'lucide-react';

function ServiceStatus({ name, healthy }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <span className="text-sm font-medium text-gray-700">{name}</span>
      {healthy === true  && <span className="flex items-center gap-1.5 text-green-600 text-sm"><CheckCircle className="w-4 h-4" /> Healthy</span>}
      {healthy === false && <span className="flex items-center gap-1.5 text-red-600 text-sm"><XCircle className="w-4 h-4" /> Down</span>}
      {healthy === null  && <span className="flex items-center gap-1.5 text-gray-400 text-sm"><Clock className="w-4 h-4" /> Checking…</span>}
    </div>
  );
}

export default function SuperOverviewPage() {
  const [stats, setStats]     = useState(null);
  const [services, setServices] = useState({ core: null, forex: null, momo: null, notification: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

    Promise.all([
      api.get('/api/v1/super/platform-stats').then(r => setStats(r.data.data ?? r.data)).catch(() => {}),
      // Health checks
      fetch(`${base}/healthz`).then(r => r.ok).catch(() => false).then(ok => setServices(p => ({ ...p, core: ok }))),
      fetch(`${base.replace('3001','3002')}/healthz`).then(r => r.ok).catch(() => false).then(ok => setServices(p => ({ ...p, forex: ok }))),
      fetch(`${base.replace('3001','3003')}/healthz`).then(r => r.ok).catch(() => false).then(ok => setServices(p => ({ ...p, momo: ok }))),
      fetch(`${base.replace('3001','3004')}/healthz`).then(r => r.ok).catch(() => false).then(ok => setServices(p => ({ ...p, notification: ok }))),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users"     value={stats?.totalUsers ?? '—'}     icon={Users} />
        <StatCard label="All Transfers"   value={stats?.totalTransfers ?? '—'} icon={Send} />
        <StatCard label="Pending KYC"     value={stats?.pendingKyc ?? '—'}     icon={ShieldCheck} />
        <StatCard label="Open Fraud"      value={stats?.openFraudAlerts ?? '—'} icon={AlertTriangle} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Services health */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-2">Services</h2>
          <ServiceStatus name="Core Service (3001)" healthy={services.core} />
          <ServiceStatus name="Forex Service (3002)" healthy={services.forex} />
          <ServiceStatus name="MoMo Service (3003)" healthy={services.momo} />
          <ServiceStatus name="Notification Service (3004)" healthy={services.notification} />
        </div>

        {/* Quick numbers */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Platform Numbers</h2>
          <div className="space-y-3 text-sm">
            {[
              ['Total Volume (RWF)', stats?.totalVolume ? Number(stats.totalVolume).toLocaleString() : '—'],
              ['Total Revenue (RWF)', stats?.totalRevenue ? Number(stats.totalRevenue).toLocaleString() : '—'],
              ['Active Agents', stats?.totalAgents ?? '—'],
              ['Transfers Today', stats?.transfersToday ?? '—'],
              ['Pending Transfers', stats?.pendingTransfers ?? '—'],
            ].map(([k,v]) => (
              <div key={k} className="flex justify-between border-b border-gray-50 pb-2 last:border-0">
                <span className="text-gray-500">{k}</span>
                <span className="font-semibold text-gray-900">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
