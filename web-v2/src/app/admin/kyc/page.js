'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { api } from '../../../lib/api';
import Badge from '../../../components/ui/Badge';
import Pagination from '../../../components/ui/Pagination';
import Spinner from '../../../components/ui/Spinner';

const STATUS_BADGE = { APPROVED:'success', UNDER_REVIEW:'info', PENDING:'warning', REJECTED:'danger', REQUIRES_DOCS:'warning' };

export default function AdminKycListPage() {
  const [apps, setApps]   = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage]   = useState(1);
  const [status, setStatus] = useState('All');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (status !== 'All') params.set('status', status);
      const r = await api.get(`/api/v1/kyc/admin/applications?${params}`);
      const d = r.data.data ?? r.data;
      setApps(Array.isArray(d) ? d : d.applications ?? []);
      setTotal(d.total ?? 0);
    } catch { setApps([]); } finally { setLoading(false); }
  }, [page, status]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">KYC Applications</h1>
      <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
        className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
        {['All','PENDING','UNDER_REVIEW','APPROVED','REJECTED','REQUIRES_DOCS'].map(s => <option key={s}>{s}</option>)}
      </select>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? <div className="flex justify-center py-16"><Spinner size="lg" /></div> : apps.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">No applications.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Applicant','Email','Risk Score','Status','Submitted','Reviewer',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {apps.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{a.user?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{a.user?.email ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{a.riskScore ?? '—'}</td>
                    <td className="px-4 py-3"><Badge variant={STATUS_BADGE[a.status] ?? 'default'} size="sm">{a.status}</Badge></td>
                    <td className="px-4 py-3 text-gray-400">{format(new Date(a.createdAt), 'dd MMM yy')}</td>
                    <td className="px-4 py-3 text-gray-500">{a.reviewedBy?.name ?? '—'}</td>
                    <td className="px-4 py-3"><Link href={`/admin/kyc/${a.id}`} className="text-brand-600 hover:text-brand-700 text-xs font-medium">Review →</Link></td>
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
