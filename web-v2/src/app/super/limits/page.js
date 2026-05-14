'use client';
import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import Spinner from '../../../components/ui/Spinner';

const LIMIT_KEYS = [
  { key:'tx.limit.client.daily_rwf',  label:'Client daily limit (RWF)',   type:'number' },
  { key:'tx.limit.client.single_rwf', label:'Client per-transfer cap (RWF)', type:'number' },
  { key:'tx.fee.flat_rwf',            label:'Flat fee per transfer (RWF)',  type:'number' },
  { key:'tx.fee.pct',                 label:'Fee percentage (e.g. 0.01)',   type:'number' },
  { key:'fraud.large_tx.threshold_rwf',label:'Large-TX fraud threshold (RWF)', type:'number' },
  { key:'fraud.velocity.max_transfers_per_hour', label:'Max transfers/hr per user', type:'number' },
];

export default function SuperLimitsPage() {
  const [configs, setConfigs] = useState({});
  const [edits, setEdits]     = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(null);

  useEffect(() => {
    api.get('/api/v1/super/config').then(r => {
      const d = r.data.data ?? r.data;
      const arr = Array.isArray(d) ? d : d.configs ?? [];
      const map = {};
      arr.forEach(c => { map[c.key] = c.value; });
      setConfigs(map);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const save = async (key) => {
    const value = edits[key] ?? configs[key] ?? '';
    setSaving(key);
    try {
      await api.put('/api/v1/super/config', { key, value });
      toast.success('Limit updated.');
      setConfigs(p => ({ ...p, [key]: value }));
    } catch (err) { toast.error(err?.response?.data?.message ?? 'Failed.'); }
    finally { setSaving(null); }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Transaction Limits & Fees</h1>
      <p className="text-sm text-gray-500">Changes take effect immediately for all new transactions.</p>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
        {LIMIT_KEYS.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between px-5 py-4 gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{label}</p>
              <p className="text-xs font-mono text-gray-400">{key}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <input
                type="number" step="any"
                value={edits[key] ?? configs[key] ?? ''}
                onChange={e => setEdits(p => ({ ...p, [key]: e.target.value }))}
                className="w-36 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button onClick={() => save(key)} disabled={saving === key}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white text-xs font-semibold rounded-lg transition">
                {saving === key ? <Spinner size="sm" /> : <><Save className="w-3.5 h-3.5" /> Save</>}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
