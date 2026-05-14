'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../../lib/api';
import Badge from '../../../../components/ui/Badge';
import Spinner from '../../../../components/ui/Spinner';
import { format } from 'date-fns';

const SEV_BADGE = { CRITICAL:'danger', HIGH:'danger', MEDIUM:'warning', LOW:'info' };

export default function FraudAlertDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const { register, handleSubmit } = useForm();

  useEffect(() => {
    api.get(`/api/v1/fraud/alerts/${id}`)
      .then(r => setAlert(r.data.data ?? r.data))
      .catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const onResolve = async (data) => {
    setResolving(true);
    try {
      await api.put(`/api/v1/fraud/alerts/${id}/resolve`, data);
      toast.success('Alert resolved.');
      router.push('/admin/fraud');
    } catch (err) { toast.error(err?.response?.data?.message ?? 'Failed.'); }
    finally { setResolving(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (!alert) return <div className="text-center py-16 text-gray-400">Alert not found.</div>;

  const metadata = alert.metadata ? (typeof alert.metadata === 'string' ? JSON.parse(alert.metadata) : alert.metadata) : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Fraud Alert</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant={SEV_BADGE[alert.severity] ?? 'default'}>{alert.severity}</Badge>
            <Badge variant={alert.status === 'RESOLVED' ? 'success' : 'warning'}>{alert.status}</Badge>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${alert.severity === 'CRITICAL' || alert.severity === 'HIGH' ? 'bg-red-100' : 'bg-amber-100'}`}>
            <AlertTriangle className={`w-5 h-5 ${alert.severity === 'CRITICAL' || alert.severity === 'HIGH' ? 'text-red-600' : 'text-amber-600'}`} />
          </div>
          <div>
            <p className="font-semibold capitalize">{alert.alertType?.replace(/_/g,' ')}</p>
            <p className="text-sm text-gray-600 mt-0.5">{alert.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t border-gray-100">
          {[
            ['User', alert.user?.name ?? alert.userId],
            ['Risk Score', alert.riskScore],
            ['Created', alert.createdAt ? format(new Date(alert.createdAt), 'dd MMM yyyy HH:mm') : '—'],
            ['Transfer', alert.transferId ?? '—'],
          ].map(([k,v]) => (
            <div key={k}><p className="text-xs text-gray-500">{k}</p><p className="font-medium">{v ?? '—'}</p></div>
          ))}
        </div>

        {metadata && (
          <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
            <p className="font-medium text-gray-700">Metadata</p>
            {Object.entries(metadata).map(([k,v]) => (
              <div key={k} className="flex justify-between"><span className="text-gray-500 capitalize">{k.replace(/_/g,' ')}</span><span className="font-medium">{JSON.stringify(v)}</span></div>
            ))}
          </div>
        )}
      </div>

      {alert.status === 'OPEN' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Resolve Alert</h2>
          <form onSubmit={handleSubmit(onResolve)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resolution</label>
              <select {...register('resolution', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">Select…</option>
                <option value="false_positive">False Positive</option>
                <option value="confirmed_fraud">Confirmed Fraud</option>
                <option value="user_verified">User Verified</option>
                <option value="no_action">No Action Required</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea {...register('notes')} rows={3} placeholder="Resolution notes…"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <button type="submit" disabled={resolving}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-semibold rounded-xl text-sm transition">
              {resolving ? 'Resolving…' : 'Mark Resolved'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
