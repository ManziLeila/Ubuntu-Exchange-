'use client';
import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { UserPlus, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import Modal from '../../../components/ui/Modal';
import Badge from '../../../components/ui/Badge';
import Spinner from '../../../components/ui/Spinner';
import Alert from '../../../components/ui/Alert';
import Pagination from '../../../components/ui/Pagination';

const schema = z.object({
  name:    z.string().min(2),
  email:   z.string().email(),
  msisdn:  z.string().min(9),
  country: z.string().length(2),
});

export default function AgentClientsPage() {
  const [clients, setClients] = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [tempPassword, setTempPassword] = useState(null);
  const [saving, setSaving]   = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/api/v1/agent/clients?page=${page}&limit=10`);
      const d = r.data.data ?? r.data;
      setClients(Array.isArray(d) ? d : d.clients ?? []);
      setTotal(d.total ?? 0);
    } catch { setClients([]); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const onRegister = async (data) => {
    setSaving(true);
    try {
      const r = await api.post('/api/v1/agent/clients', data);
      const pw = r.data.data?.tempPassword ?? r.data.tempPassword;
      setTempPassword(pw);
      reset();
      load();
    } catch (err) { toast.error(err?.response?.data?.message ?? 'Registration failed.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Clients</h1>
        <button onClick={() => { setShowModal(true); setTempPassword(null); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition">
          <UserPlus className="w-4 h-4" /> Register Client
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : clients.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">No clients yet. Register your first client.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Name','Email','Phone','Country','KYC','Joined'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clients.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-gray-600">{c.email}</td>
                    <td className="px-4 py-3 text-gray-600">{c.msisdn ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{c.country}</td>
                    <td className="px-4 py-3">
                      <Badge variant={c.kycApplication?.status === 'APPROVED' ? 'success' : 'warning'} size="sm">
                        {c.kycApplication?.status ?? 'NONE'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{format(new Date(c.createdAt), 'dd MMM yy')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {total > 10 && <div className="flex justify-center"><Pagination page={page} totalPages={Math.ceil(total/10)} onPageChange={setPage} /></div>}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); reset(); setTempPassword(null); }} title="Register New Client">
        {tempPassword ? (
          <div className="space-y-4 mt-2">
            <Alert type="success" title="Client registered!" message={`Share these credentials with the client.`} />
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <p className="font-medium text-gray-700">Temporary password:</p>
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                <code className="flex-1 font-mono text-gray-900">{tempPassword}</code>
                <button onClick={() => { navigator.clipboard.writeText(tempPassword); toast.success('Copied!'); }}
                  className="text-gray-400 hover:text-gray-600"><Copy className="w-4 h-4" /></button>
              </div>
              <p className="text-xs text-gray-500">The client must change this password on first login.</p>
            </div>
            <button onClick={() => { setShowModal(false); setTempPassword(null); }}
              className="w-full py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition">Done</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onRegister)} className="space-y-4 mt-2">
            {[
              { name:'name',    label:'Full name',     placeholder:'Alice Uwase' },
              { name:'email',   label:'Email',         placeholder:'alice@example.com' },
              { name:'msisdn',  label:'Phone (MSISDN)',placeholder:'+250780000001' },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                <input {...register(f.name)} placeholder={f.placeholder}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${errors[f.name] ? 'border-red-400' : 'border-gray-300'}`} />
                {errors[f.name] && <p className="mt-0.5 text-xs text-red-500">{errors[f.name].message}</p>}
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <select {...register('country')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">Select…</option>
                {[['RW','Rwanda'],['GH','Ghana'],['UG','Uganda'],['KE','Kenya'],['NG','Nigeria']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => { setShowModal(false); reset(); }}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white rounded-lg text-sm font-semibold transition">
                {saving ? 'Registering…' : 'Register'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
