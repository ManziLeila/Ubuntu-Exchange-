'use client';
import { useState, useEffect, useCallback } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import Spinner from '../../../components/ui/Spinner';
import Alert from '../../../components/ui/Alert';

function parseValue(value, type) {
  if (type === 'number')  return Number(value);
  if (type === 'boolean') return value === 'true';
  if (type === 'json')    { try { return JSON.parse(value); } catch { return value; } }
  return value;
}

export default function SuperConfigPage() {
  const [configs, setConfigs]   = useState([]);
  const [edits, setEdits]       = useState({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(null);
  const [saved, setSaved]       = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/api/v1/super/config');
      const d = r.data.data ?? r.data;
      setConfigs(Array.isArray(d) ? d : d.configs ?? []);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (cfg) => {
    const raw = edits[cfg.key] ?? cfg.value;
    setSaving(cfg.key);
    try {
      await api.put('/api/v1/super/config', { key: cfg.key, value: raw });
      toast.success(`${cfg.key} updated.`);
      setSaved(cfg.key);
      setTimeout(() => setSaved(null), 2000);
      load();
    } catch (err) { toast.error(err?.response?.data?.message ?? 'Failed.'); }
    finally { setSaving(null); }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Configuration</h1>
          <p className="text-sm text-gray-500 mt-0.5">Live platform settings — changes take effect immediately.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <Alert type="warning" title="Caution" message="Changes to these settings affect all users on the platform immediately. Review carefully before saving." />

      <div className="space-y-3">
        {configs.map(cfg => (
          <div key={cfg.key} className={`bg-white rounded-xl border p-4 transition ${saved === cfg.key ? 'border-green-400' : 'border-gray-200'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 font-mono">{cfg.key}</p>
                {cfg.description && <p className="text-xs text-gray-400 mt-0.5">{cfg.description}</p>}
                <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-500">{cfg.type}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <input
                  value={edits[cfg.key] ?? cfg.value ?? ''}
                  onChange={e => setEdits(p => ({ ...p, [cfg.key]: e.target.value }))}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-48 font-mono"
                />
                <button onClick={() => handleSave(cfg)} disabled={saving === cfg.key}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white text-xs font-semibold rounded-lg transition">
                  {saving === cfg.key ? <><Spinner size="sm" /></> : <><Save className="w-3.5 h-3.5" /> Save</>}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
