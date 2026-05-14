'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ShieldCheck, AlertTriangle, FileText, Users, ArrowUpRight } from 'lucide-react';
import { api } from '../../../lib/api';
import StatCard from '../../../components/ui/StatCard';
import Badge from '../../../components/ui/Badge';
import Spinner from '../../../components/ui/Spinner';

export default function ComplianceDashboardPage() {
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [kycRes, fraudRes, amlRes] = await Promise.all([
        api.get('/api/v1/kyc/admin/applications?status=UNDER_REVIEW&limit=5'),
        api.get('/api/v1/fraud/alerts?status=OPEN&limit=5'),
        api.get('/api/v1/fraud/aml-checks?limit=5'),
      ]);
      const kycD = kycRes.data.data ?? kycRes.data;
      const fraudD = fraudRes.data.data ?? fraudRes.data;
      setData({
        pendingKyc: Array.isArray(kycD) ? kycD : kycD.applications ?? [],
        openAlerts: Array.isArray(fraudD) ? fraudD : fraudD.alerts ?? [],
        recentAml:  amlRes.data.data ?? amlRes.data ?? [],
        kycTotal:   kycD.total ?? 0,
        fraudTotal: fraudD.total ?? 0,
      });
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Compliance Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending KYC" value={data?.kycTotal ?? 0} icon={ShieldCheck} />
        <StatCard label="Open Fraud Alerts" value={data?.fraudTotal ?? 0} icon={AlertTriangle} />
        <StatCard label="AML Checks Today" value={data?.recentAml?.length ?? 0} icon={FileText} />
        <StatCard label="Flagged Transfers" value="—" icon={Users} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending KYC */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Pending KYC Reviews</h2>
            <Link href="/compliance/kyc-review" className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">View all <ArrowUpRight className="w-3 h-3" /></Link>
          </div>
          {(data?.pendingKyc ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No pending applications.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {(data?.pendingKyc ?? []).map(a => (
                <Link key={a.id} href={`/compliance/kyc-review/${a.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.user?.name ?? '—'}</p>
                    <p className="text-xs text-gray-400">{a.user?.country} · {format(new Date(a.createdAt), 'dd MMM')}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="info" size="sm">UNDER_REVIEW</Badge>
                    {a.riskScore != null && <p className="text-xs text-gray-400 mt-0.5">Risk: {a.riskScore}</p>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Open fraud alerts */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Open Fraud Alerts</h2>
            <Link href="/compliance/flagged" className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">View all <ArrowUpRight className="w-3 h-3" /></Link>
          </div>
          {(data?.openAlerts ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No open alerts.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {(data?.openAlerts ?? []).map(a => (
                <Link key={a.id} href={`/admin/fraud/${a.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">{a.alertType?.replace(/_/g,' ')}</p>
                    <p className="text-xs text-gray-400">{a.user?.name ?? '—'} · {format(new Date(a.createdAt), 'dd MMM')}</p>
                  </div>
                  <Badge variant={a.severity === 'HIGH' || a.severity === 'CRITICAL' ? 'danger' : 'warning'} size="sm">{a.severity}</Badge>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
