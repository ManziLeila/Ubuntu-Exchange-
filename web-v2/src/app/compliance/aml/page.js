'use client';
import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import Badge from '../../../components/ui/Badge';
import Pagination from '../../../components/ui/Pagination';
import Spinner from '../../../components/ui/Spinner';

export default function AmlPage() {
  const [checks, setChecks] = useState([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(null);
  const [userId, setUserId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/api/v1/fraud/aml-checks?page=${page}&limit=15`);
      const d = r.data.data ?? r.data;
      setChecks(Array.isArray(d) ? d : d.checks ?? []);
      setTotal(d.total ?? 0);
    } catch { setChecks([]); } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const runScreen = async () => {
    if (!userId.trim()) return;
    setScanning(userId);
    try {
      await api.post(`/api/v1/fraud/aml-checks/${userId.trim()}`);
      toast.success('AML screening initiated.');
      setUserId('');
      load();
    } catch (err) { toast.error(err?.response?.data?.message ?? 'Failed.'); }
    finally { setScanning(null); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">AML Checks</h1>

      {/* Manual screen */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Manual AML Screening</h2>
        <div className="flex gap-3">
          <input value={userId} onChange={e => setUserId(e.target.value)} placeholder="Enter user ID to screen…"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <button onClick={runScreen} disabled={!!scanning || !userId.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white text-sm font-semibold rounded-lg transition">
            <Search className="w-4 h-4" /> {scanning ? 'Screening…' : 'Screen User'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? <div className="flex justify-center py-16"><Spinner size="lg" /></div> : checks.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">No AML checks found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['User','Type','Status','PEP Match','Sanction','Provider Ref','Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {checks.map(c => {
                  const result = c.result ? (typeof c.result === 'string' ? JSON.parse(c.result) : c.result) : {};
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{c.user?.name ?? c.userId?.slice(0,8)}</td>
                      <td className="px-4 py-3 text-gray-500 capitalize">{c.checkType?.replace(/_/g,' ')}</td>
                      <td className="px-4 py-3"><Badge variant={c.status === 'CLEAR' ? 'success' : c.status === 'FLAGGED' ? 'danger' : 'warning'} size="sm">{c.status}</Badge></td>
                      <td className="px-4 py-3"><Badge variant={result.pepMatch ? 'danger' : 'success'} size="sm">{result.pepMatch ? 'YES' : 'NO'}</Badge></td>
                      <td className="px-4 py-3"><Badge variant={result.sanctionMatch ? 'danger' : 'success'} size="sm">{result.sanctionMatch ? 'YES' : 'NO'}</Badge></td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.providerRef ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-400">{c.checkedAt ? format(new Date(c.checkedAt), 'dd MMM yy') : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {total > 15 && <div className="flex justify-center"><Pagination page={page} totalPages={Math.ceil(total/15)} onPageChange={setPage} /></div>}
    </div>
  );
}
