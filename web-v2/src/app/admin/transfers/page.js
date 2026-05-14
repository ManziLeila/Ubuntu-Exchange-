'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { api } from '../../../lib/api';
import Badge from '../../../components/ui/Badge';
import Pagination from '../../../components/ui/Pagination';
import Spinner from '../../../components/ui/Spinner';

const STATUS_OPTS = ['All','PENDING','OTP_PENDING','PROCESSING','COMPLETED','FAILED','CANCELLED','FLAGGED'];
const STATUS_BADGE = { PENDING:'pending', OTP_PENDING:'pending', PROCESSING:'info', COMPLETED:'success', FAILED:'danger', CANCELLED:'default', FLAGGED:'warning' };

export default function AdminTransfersPage() {
  const [transfers, setTransfers] = useState([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (status !== 'All') params.set('status', status);
      if (search) params.set('search', search);
      const r = await api.get(`/api/v1/transfers?${params}`);
      const d = r.data.data ?? r.data;
      setTransfers(d.transfers ?? (Array.isArray(d) ? d : []));
      setTotal(d.total ?? 0);
    } catch { setTransfers([]); } finally { setLoading(false); }
  }, [page, status, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">All Transfers</h1>
      <div className="flex flex-col sm:flex-row gap-3">
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="URC, sender or recipient…"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? <div className="flex justify-center py-16"><Spinner size="lg" /></div> : transfers.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">No transfers found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['URC','Sender','Recipient','Sent','Corridor','Status','Date',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transfers.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{tx.urc}</td>
                    <td className="px-4 py-3 text-gray-700">{tx.sender?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{tx.recipientName ?? tx.recipientMsisdn}</td>
                    <td className="px-4 py-3 font-medium">{Number(tx.sendAmount).toLocaleString()} {tx.fromCurrency}</td>
                    <td className="px-4 py-3 text-gray-500">{tx.corridor}</td>
                    <td className="px-4 py-3"><Badge variant={STATUS_BADGE[tx.status] ?? 'default'} size="sm">{tx.status}</Badge></td>
                    <td className="px-4 py-3 text-gray-400">{format(new Date(tx.createdAt), 'dd MMM yy')}</td>
                    <td className="px-4 py-3"><Link href={`/admin/transfers/${tx.id}`} className="text-brand-600 hover:text-brand-700 text-xs font-medium">View →</Link></td>
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
