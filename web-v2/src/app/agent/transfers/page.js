'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { api } from '../../../lib/api';
import Badge from '../../../components/ui/Badge';
import Pagination from '../../../components/ui/Pagination';
import Spinner from '../../../components/ui/Spinner';

const STATUS_BADGE = { PENDING:'pending', PROCESSING:'info', COMPLETED:'success', FAILED:'danger', CANCELLED:'default', FLAGGED:'warning' };

export default function AgentTransfersPage() {
  const [transfers, setTransfers] = useState([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/api/v1/agent/transfers?page=${page}&limit=10`);
      const d = r.data.data ?? r.data;
      setTransfers(d.transfers ?? (Array.isArray(d) ? d : []));
      setTotal(d.total ?? 0);
    } catch { setTransfers([]); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Transfers</h1>
        <Link href="/agent/transfers/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition">
          <Plus className="w-4 h-4" /> New Transfer
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : transfers.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">No transfers yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['URC','Client','Recipient','Sent','Received','Status','Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transfers.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{tx.urc}</td>
                    <td className="px-4 py-3 text-gray-700">{tx.sender?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{tx.recipientName ?? tx.recipientMsisdn}</td>
                    <td className="px-4 py-3">{Number(tx.sendAmount).toLocaleString()} {tx.fromCurrency}</td>
                    <td className="px-4 py-3">{Number(tx.receiveAmount ?? 0).toLocaleString()} {tx.toCurrency}</td>
                    <td className="px-4 py-3"><Badge variant={STATUS_BADGE[tx.status] ?? 'default'} size="sm">{tx.status}</Badge></td>
                    <td className="px-4 py-3 text-gray-400">{format(new Date(tx.createdAt), 'dd MMM yy')}</td>
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
