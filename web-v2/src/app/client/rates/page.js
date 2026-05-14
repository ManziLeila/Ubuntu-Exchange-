'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../lib/api';
import RateWidget from '../../../components/ui/RateWidget';
import Spinner from '../../../components/ui/Spinner';

const CORRIDORS = [
  { corridor: 'RWF_GHS', from: 'RWF', to: 'GHS' },
  { corridor: 'RWF_UGX', from: 'RWF', to: 'UGX' },
  { corridor: 'RWF_KES', from: 'RWF', to: 'KES' },
  { corridor: 'RWF_USD', from: 'RWF', to: 'USD' },
];

export default function RatesPage() {
  const [rates, setRates]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [calcAmt, setCalcAmt]   = useState('');
  const [calcCorr, setCalcCorr] = useState('RWF_GHS');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        CORRIDORS.map(c => api.get(`/api/v1/forex/rates?corridor=${c.corridor}`).then(r => r.data.data ?? r.data).catch(() => null))
      );
      setRates(results.filter(Boolean));
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const selectedRate = rates.find(r => r.corridor === calcCorr);
  const receiveAmt = selectedRate && calcAmt ? (Number(calcAmt) * selectedRate.clientRate).toFixed(2) : null;
  const corrObj = CORRIDORS.find(c => c.corridor === calcCorr);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Exchange Rates</h1>
        <p className="text-sm text-gray-500 mt-1">Rates refresh every 30 seconds</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CORRIDORS.map(c => {
            const rate = rates.find(r => r.corridor === c.corridor);
            return (
              <RateWidget key={c.corridor} fromCurrency={c.from} toCurrency={c.to}
                rate={rate?.clientRate} fetchedAt={rate?.fetchedAt} onRefresh={load} />
            );
          })}
        </div>
      )}

      {/* Calculator */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
        <h2 className="text-lg font-semibold text-gray-900">Transfer Calculator</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount to send (RWF)</label>
            <input type="number" value={calcAmt} onChange={e => setCalcAmt(e.target.value)}
              placeholder="100,000"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Send to</label>
            <select value={calcCorr} onChange={e => setCalcCorr(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
              {CORRIDORS.map(c => <option key={c.corridor} value={c.corridor}>{c.from} → {c.to}</option>)}
            </select>
          </div>
        </div>
        {receiveAmt && (
          <div className="bg-brand-50 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Recipient gets approximately</p>
              <p className="text-2xl font-bold text-brand-700">{Number(receiveAmt).toLocaleString()} {corrObj?.to}</p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>Rate: 1 {corrObj?.from} = {selectedRate?.clientRate} {corrObj?.to}</p>
              <p>Fee: ~{Math.max(500, Number(calcAmt) * 0.01).toLocaleString()} RWF</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
