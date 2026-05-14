'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Users, Send, DollarSign, Wallet, ArrowUpRight, UserPlus } from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import StatCard from '../../../components/ui/StatCard';
import Badge from '../../../components/ui/Badge';
import Spinner from '../../../components/ui/Spinner';

const STATUS_BADGE = { PENDING:'pending', PROCESSING:'info', COMPLETED:'success', FAILED:'danger', CANCELLED:'default' };

export default function AgentDashboardPage() {
  const { user } = useAuth();
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [clientsRes, txRes, commRes, floatRes] = await Promise.all([
        api.get('/api/v1/agent/clients?limit=5'),
        api.get('/api/v1/agent/transfers?limit=5'),
        api.get('/api/v1/agent/commissions?limit=5'),
        api.get('/api/v1/agent/float'),
      ]);
      setData({
        clients:     clientsRes.data.data ?? clientsRes.data,
        transfers:   txRes.data.data?.transfers ?? txRes.data.transfers ?? [],
        totalTx:     txRes.data.data?.total ?? txRes.data.total ?? 0,
        commissions: commRes.data.data?.commissions ?? commRes.data.commissions ?? [],
        totalEarned: commRes.data.data?.totalEarned ?? commRes.data.totalEarned ?? 0,
        floats:      floatRes.data.data ?? floatRes.data ?? [],
      });
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;

  const rwfFloat = data?.floats?.find?.(f => f.currency === 'RWF');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agent Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">{user?.name}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/agent/clients" className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium text-sm rounded-xl transition">
            <UserPlus className="w-4 h-4" /> Register Client
          </Link>
          <Link href="/agent/transfers/new" className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm rounded-xl transition">
            <Send className="w-4 h-4" /> New Transfer
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Clients" value={data?.clients?.total ?? data?.clients?.length ?? 0} icon={Users} />
        <StatCard label="Transfers" value={data?.totalTx ?? 0} icon={Send} />
        <StatCard label="Commissions Earned" value={`${Number(data?.totalEarned ?? 0).toLocaleString()} RWF`} icon={DollarSign} />
        <StatCard label="RWF Float" value={`${Number(rwfFloat?.balance ?? 0).toLocaleString()} RWF`} icon={Wallet} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent transfers */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Transfers</h2>
            <Link href="/agent/transfers" className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">View all <ArrowUpRight className="w-3 h-3" /></Link>
          </div>
          {(data?.transfers ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No transfers yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {(data?.transfers ?? []).map(tx => (
                <div key={tx.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{tx.recipientName ?? tx.recipientMsisdn}</p>
                    <p className="text-xs text-gray-400">{tx.urc} · {format(new Date(tx.createdAt), 'dd MMM')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{Number(tx.sendAmount).toLocaleString()} {tx.fromCurrency}</p>
                    <Badge variant={STATUS_BADGE[tx.status] ?? 'default'} size="sm">{tx.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent commissions */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Commissions</h2>
            <Link href="/agent/commissions" className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">View all <ArrowUpRight className="w-3 h-3" /></Link>
          </div>
          {(data?.commissions ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No commissions yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {(data?.commissions ?? []).map(c => (
                <div key={c.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{Number(c.amount).toLocaleString()} {c.currency ?? 'RWF'}</p>
                    <p className="text-xs text-gray-400">{c.transferId?.slice(0,8) ?? '—'} · {c.rate * 100}%</p>
                  </div>
                  <p className="text-xs text-gray-400">{format(new Date(c.createdAt), 'dd MMM')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
