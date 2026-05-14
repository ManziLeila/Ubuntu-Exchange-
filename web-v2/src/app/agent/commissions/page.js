'use client';
import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { api } from '../../../lib/api';
import StatCard from '../../../components/ui/StatCard';
import Pagination from '../../../components/ui/Pagination';
import Spinner from '../../../components/ui/Spinner';
import { DollarSign } from 'lucide-react';

export default function CommissionsPage() {
  const [data, setData]     = useState(null);
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/api/v1/agent/commissions?page=${page}&limit=10`);
      setData(r.data.data ?? r.data);
    } catch { } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const commissions = data?.commissions ?? (Array.isArray(data) ? data : []);
  const total = data?.total ?? 0;
  const totalEarned = data?.totalEarned ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Commissions</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Earned" value={`${Number(totalEarned).toLocaleString()} RWF`} icon={DollarSign} />
        <StatCard label="This Month" value={`${Number(data?.thisMonth ?? 0).toLocaleString()} RWF`} icon={DollarSign} />
        <StatCard label="Total Records" value={total} icon={DollarSign} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : commissions.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">No commission records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Transfer Ref','Amount','Rate','Currency','Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {commissions.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{c.transferId?.slice(0,8) ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold text-green-700">+{Number(c.amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-500">{(c.rate * 100).toFixed(2)}%</td>
                    <td className="px-4 py-3 text-gray-500">{c.currency ?? 'RWF'}</td>
                    <td className="px-4 py-3 text-gray-400">{format(new Date(c.createdAt), 'dd MMM yyyy')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {total > 10 && <div className="flex justify-center"><Pagination page={page} totalPages={Math.ceil(total/10)} onPageChange={setPage} /></div>}
    </div>
  );
}
