'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { api } from '../../../lib/api';
import Badge from '../../../components/ui/Badge';
import Pagination from '../../../components/ui/Pagination';
import Spinner from '../../../components/ui/Spinner';

const SEV_BADGE = { CRITICAL:'danger', HIGH:'danger', MEDIUM:'warning', LOW:'info' };

export default function AdminFraudPage() {
  const [alerts, setAlerts] = useState([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [status, setStatus] = useState('All');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (status !== 'All') params.set('status', status);
      const r = await api.get(`/api/v1/fraud/alerts?${params}`);
      const d = r.data.data ?? r.data;
      setAlerts(Array.isArray(d) ? d : d.alerts ?? []);
      setTotal(d.total ?? 0);
    } catch { setAlerts([]); } finally { setLoading(false); }
  }, [page, status]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Fraud Alerts</h1>
      <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
        className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white">
        {['All','OPEN','INVESTIGATING','RESOLVED'].map(s => <option key={s}>{s}</option>)}
      </select>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? <div className="flex justify-center py-16"><Spinner size="lg" /></div> : alerts.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">No alerts.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Type','User','Severity','Score','Status','Created',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {alerts.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 capitalize">{a.alertType?.replace(/_/g,' ')}</td>
                    <td className="px-4 py-3 text-gray-600">{a.user?.name ?? a.userId?.slice(0,8)}</td>
                    <td className="px-4 py-3"><Badge variant={SEV_BADGE[a.severity] ?? 'default'} size="sm">{a.severity}</Badge></td>
                    <td className="px-4 py-3 font-medium">{a.riskScore}</td>
                    <td className="px-4 py-3"><Badge variant={a.status === 'RESOLVED' ? 'success' : 'warning'} size="sm">{a.status}</Badge></td>
                    <td className="px-4 py-3 text-gray-400">{format(new Date(a.createdAt), 'dd MMM HH:mm')}</td>
                    <td className="px-4 py-3"><Link href={`/admin/fraud/${a.id}`} className="text-brand-600 hover:text-brand-700 text-xs font-medium">View →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {total > 15 && <div className="flex justify-center"><Pagination page={page} totalPages={Math.ceil(total/15)} onPageChange={setPage} /></div>}
    </div>
  );
}
