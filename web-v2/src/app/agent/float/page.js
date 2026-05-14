'use client';
import { useState, useEffect } from 'react';
import { Wallet, Mail } from 'lucide-react';
import { api } from '../../../lib/api';
import Spinner from '../../../components/ui/Spinner';

const CCY_FLAGS = { RWF: '🇷🇼', GHS: '🇬🇭', UGX: '🇺🇬', KES: '🇰🇪', USD: '🇺🇸' };

export default function FloatPage() {
  const [floats, setFloats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/v1/agent/float').then(r => setFloats(r.data.data ?? r.data ?? [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Float Balances</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(Array.isArray(floats) ? floats : [floats]).map(f => (
          <div key={f.currency ?? f.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{CCY_FLAGS[f.currency] ?? '💰'}</span>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">{f.currency} Float</p>
                <p className="text-2xl font-bold text-gray-900">{Number(f.balance).toLocaleString()}</p>
              </div>
            </div>
            <div className={`text-xs px-3 py-1.5 rounded-full inline-flex items-center gap-1 ${
              f.balance < 10000 ? 'bg-red-50 text-red-600' : f.balance < 100000 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'
            }`}>
              <Wallet className="w-3 h-3" />
              {f.balance < 10000 ? 'Low — request top-up' : f.balance < 100000 ? 'Medium' : 'Healthy'}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
        <h2 className="font-semibold text-amber-900 mb-2">Need to top up your float?</h2>
        <p className="text-sm text-amber-700 mb-4">Contact our operations team to arrange a float top-up for your agent account.</p>
        <a href="mailto:ops@globaltransact.com"
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl transition">
          <Mail className="w-4 h-4" /> Contact Operations
        </a>
      </div>
    </div>
  );
}
