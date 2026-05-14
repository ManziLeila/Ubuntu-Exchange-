'use client';
import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { api } from '../../../lib/api';
import Pagination from '../../../components/ui/Pagination';
import Spinner from '../../../components/ui/Spinner';

export default function AuditPage() {
  const [logs, setLogs]   = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage]   = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/api/v1/super/audit?page=${page}&limit=20`);
      const d = r.data.data ?? r.data;
      setLogs(Array.isArray(d) ? d : d.logs ?? []);
      setTotal(d.total ?? 0);
    } catch { setLogs([]); } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? <div className="flex justify-center py-16"><Spinner size="lg" /></div> : logs.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">No audit entries.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.map((log, i) => (
              <div key={log.id ?? i} className="px-5 py-3 flex items-start gap-4">
                <p className="text-xs text-gray-400 whitespace-nowrap mt-0.5">
                  {log.createdAt ? format(new Date(log.createdAt), 'dd MMM HH:mm') : '—'}
                </p>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{log.action ?? log.event ?? JSON.stringify(log)}</p>
                  {log.actor && <p className="text-xs text-gray-400">{log.actor?.name ?? log.actor} · {log.ipAddress ?? ''}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {total > 20 && <div className="flex justify-center"><Pagination page={page} totalPages={Math.ceil(total/20)} onPageChange={setPage} /></div>}
    </div>
  );
}
