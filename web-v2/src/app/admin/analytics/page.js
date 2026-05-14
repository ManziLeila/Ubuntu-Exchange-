'use client';
import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import AreaChartComp from '../../../components/charts/AreaChart';
import BarChartComp from '../../../components/charts/BarChart';
import PieChartComp from '../../../components/charts/PieChart';
import StatCard from '../../../components/ui/StatCard';
import Spinner from '../../../components/ui/Spinner';
import { TrendingUp, Send, DollarSign, Users } from 'lucide-react';

function generateDemoVolume() {
  const data = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    data.push({ date: d.toLocaleDateString('en', { month:'short', day:'numeric' }), volume: Math.floor(Math.random() * 5000000) + 500000, count: Math.floor(Math.random() * 50) + 5 });
  }
  return data;
}

const STATUS_PIE = [
  { name:'Completed', value:62, color:'#22c55e' },
  { name:'Pending',   value:18, color:'#f59e0b' },
  { name:'Failed',    value:8,  color:'#ef4444' },
  { name:'Cancelled', value:12, color:'#94a3b8' },
];

const CORRIDOR_DATA = [
  { corridor:'RWF→GHS', volume:12500000 },
  { corridor:'RWF→UGX', volume:8200000 },
  { corridor:'RWF→KES', volume:6700000 },
  { corridor:'RWF→USD', volume:4300000 },
];

export default function AdminAnalyticsPage() {
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [volumeData]        = useState(generateDemoVolume());

  useEffect(() => {
    api.get('/api/v1/super/platform-stats').then(r => setStats(r.data.data ?? r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats?.totalUsers ?? '—'} icon={Users} />
        <StatCard label="Total Transfers" value={stats?.totalTransfers ?? '—'} icon={Send} />
        <StatCard label="Total Volume (RWF)" value={stats?.totalVolume ? Number(stats.totalVolume).toLocaleString() : '—'} icon={DollarSign} />
        <StatCard label="Revenue (RWF)" value={stats?.totalRevenue ? Number(stats.totalRevenue).toLocaleString() : '—'} icon={TrendingUp} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <AreaChartComp title="Transfer Volume (Last 30 Days)" data={volumeData} xKey="date"
          areas={[{ dataKey:'volume', color:'#3b82f6', name:'Volume (RWF)' }]} height={280} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <PieChartComp title="Transfer Status Breakdown" data={STATUS_PIE} height={280} />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <BarChartComp title="Volume by Corridor (RWF)" data={CORRIDOR_DATA} xKey="corridor"
            bars={[{ dataKey:'volume', color:'#6366f1', name:'Volume' }]} height={280} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <BarChartComp title="Daily Transfer Count (Last 30 Days)" data={volumeData} xKey="date"
          bars={[{ dataKey:'count', color:'#10b981', name:'Transfers' }]} height={220} />
      </div>
    </div>
  );
}
