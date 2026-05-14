'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Users, Send, DollarSign, ShieldCheck, ArrowUpRight, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import { useSocket } from '../../../contexts/SocketContext';
import StatCard from '../../../components/ui/StatCard';
import Badge from '../../../components/ui/Badge';
import Spinner from '../../../components/ui/Spinner';

const STATUS_BADGE = { PENDING:'pending', OTP_PENDING:'pending', PROCESSING:'info', COMPLETED:'success', FAILED:'danger', CANCELLED:'default', FLAGGED:'warning' };

export default function AdminDashboardPage() {
  const { socket } = useSocket();
  const [stats, setStats]     = useState(null);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [statsRes, txRes] = await Promise.all([
        api.get('/api/v1/super/platform-stats').catch(() => ({ data: {} })),
        api.get('/api/v1/transfers?limit=10&status=PENDING'),
      ]);
      setStats(statsRes.data.data ?? statsRes.data);
      const d = txRes.data.data ?? txRes.data;
      setTransfers(d.transfers ?? (Array.isArray(d) ? d : []));
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!socket) return;
    socket.on('transfer:update', load);
    return () => socket.off('transfer:update', load);
  }, [socket, load]);

  const handleApprove = async (id) => {
    try {
      await api.post(`/api/v1/transfers/${id}/approve`);
      toast.success('Transfer approved');
      load();
    } catch (err) { toast.error(err?.response?.data?.message ?? 'Failed'); }
  };

  const handleReject = async (id) => {
    try {
      await api.post(`/api/v1/transfers/${id}/reject`, { reason: 'Rejected by admin' });
      toast.success('Transfer rejected');
      load();
    } catch (err) { toast.error(err?.response?.data?.message ?? 'Failed'); }
  };

  if (loading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <Link href="/admin/analytics" className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1">
          Analytics <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats?.totalUsers ?? '—'} icon={Users} />
        <StatCard label="Transfers Today" value={stats?.transfersToday ?? '—'} icon={Send} />
        <StatCard label="Volume Today (RWF)" value={stats?.volumeToday ? Number(stats.volumeToday).toLocaleString() : '—'} icon={DollarSign} />
        <StatCard label="Pending KYC" value={stats?.pendingKyc ?? '—'} icon={ShieldCheck} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Pending Transfers</h2>
          <Link href="/admin/transfers" className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
            All transfers <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        {transfers.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">No pending transfers.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['URC','Sender','Amount','Corridor','Status','Date','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transfers.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{tx.urc}</td>
                    <td className="px-4 py-3 text-gray-700">{tx.sender?.name ?? '—'}</td>
                    <td className="px-4 py-3 font-medium">{Number(tx.sendAmount).toLocaleString()} {tx.fromCurrency}</td>
                    <td className="px-4 py-3 text-gray-500">{tx.corridor}</td>
                    <td className="px-4 py-3"><Badge variant={STATUS_BADGE[tx.status] ?? 'default'} size="sm">{tx.status}</Badge></td>
                    <td className="px-4 py-3 text-gray-400">{format(new Date(tx.createdAt), 'dd MMM HH:mm')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleApprove(tx.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-medium rounded-lg transition">
                          <CheckCircle className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button onClick={() => handleReject(tx.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium rounded-lg transition">
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
