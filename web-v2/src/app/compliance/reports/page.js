'use client';
import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { FileText, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import Badge from '../../../components/ui/Badge';
import Spinner from '../../../components/ui/Spinner';

const REPORT_TYPES = ['compliance','audit','transaction','aml_summary','revenue'];

export default function ComplianceReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [form, setForm]       = useState({ type: 'compliance', dateFrom: '', dateTo: '' });

  const load = useCallback(async () => {
    try {
      const r = await api.get('/api/v1/reports?limit=20');
      const d = r.data.data ?? r.data;
      setReports(Array.isArray(d) ? d : d.reports ?? []);
    } catch { setReports([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const request = async () => {
    setRequesting(true);
    try {
      await api.post('/api/v1/reports/request', form);
      toast.success('Report generation started. Check back shortly.');
      load();
    } catch (err) { toast.error(err?.response?.data?.message ?? 'Failed.'); }
    finally { setRequesting(false); }
  };

  const statusBadge = { PENDING:'warning', PROCESSING:'info', COMPLETED:'success', FAILED:'danger' };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Reports</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Request New Report</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Report type</label>
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
              {REPORT_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.replace(/_/g,' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From date</label>
            <input type="date" value={form.dateFrom} onChange={e => setForm(p => ({ ...p, dateFrom: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To date</label>
            <input type="date" value={form.dateTo} onChange={e => setForm(p => ({ ...p, dateTo: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
        </div>
        <button onClick={request} disabled={requesting}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white text-sm font-semibold rounded-xl transition">
          <FileText className="w-4 h-4" /> {requesting ? 'Requesting…' : 'Generate Report'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? <div className="flex justify-center py-16"><Spinner size="lg" /></div> : reports.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">No reports yet.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {reports.map(r => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium capitalize">{r.type?.replace(/_/g,' ')} Report</p>
                    <p className="text-xs text-gray-400">Requested by {r.requestedBy?.name ?? '—'} · {format(new Date(r.createdAt), 'dd MMM yyyy HH:mm')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={statusBadge[r.status] ?? 'default'} size="sm">{r.status}</Badge>
                  {r.status === 'COMPLETED' && r.fileUrl && (
                    <a href={r.fileUrl} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-100 hover:bg-brand-200 text-brand-700 text-xs font-medium rounded-lg transition">
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
