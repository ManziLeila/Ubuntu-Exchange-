'use client';
import { useState, useEffect, useCallback } from 'react';
import { Star, Trash2, Plus, Phone, Globe } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import Modal from '../../../components/ui/Modal';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import Spinner from '../../../components/ui/Spinner';
import EmptyState from '../../../components/ui/EmptyState';

const schema = z.object({
  nickname:    z.string().min(1, 'Required'),
  fullName:    z.string().min(2, 'Required'),
  msisdn:      z.string().min(9, 'Enter valid phone'),
  country:     z.string().length(2, 'Select country'),
  currency:    z.string().min(2, 'Required'),
  payoutMethod:z.enum(['momo','bank']),
  network:     z.string().optional(),
});

const COUNTRIES = [
  { code:'GH', name:'Ghana', ccy:'GHS' }, { code:'UG', name:'Uganda', ccy:'UGX' },
  { code:'KE', name:'Kenya', ccy:'KES' }, { code:'NG', name:'Nigeria', ccy:'NGN' },
  { code:'TZ', name:'Tanzania', ccy:'TZS' },
];

export default function BeneficiariesPage() {
  const [list, setList]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { payoutMethod: 'momo' },
  });

  const selectedCountry = watch('country');
  useEffect(() => {
    const match = COUNTRIES.find(c => c.code === selectedCountry);
    if (match) setValue('currency', match.ccy);
  }, [selectedCountry, setValue]);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/api/v1/beneficiaries'); setList(r.data.data ?? []); }
    catch { setList([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onSave = async (data) => {
    setSaving(true);
    try {
      await api.post('/api/v1/beneficiaries', data);
      toast.success('Beneficiary saved!');
      setShowAdd(false); reset();
      load();
    } catch (err) { toast.error(err?.response?.data?.message ?? 'Save failed.'); }
    finally { setSaving(false); }
  };

  const onDelete = async () => {
    try {
      await api.delete(`/api/v1/beneficiaries/${deleteId}`);
      toast.success('Removed.');
      setDeleteId(null);
      load();
    } catch { toast.error('Delete failed.'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Saved Recipients</h1>
        <button onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition">
          <Plus className="w-4 h-4" /> Add Recipient
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : list.length === 0 ? (
        <EmptyState title="No saved recipients" description="Add recipients to send money faster next time." icon={Phone}
          action={{ label: 'Add Recipient', onClick: () => setShowAdd(true) }} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map(b => (
            <div key={b.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-gray-900">{b.nickname}</p>
                    {b.isFavorite && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
                  </div>
                  <p className="text-sm text-gray-500">{b.fullName}</p>
                </div>
                <button onClick={() => setDeleteId(b.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400" />{b.msisdn}</div>
                <div className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-gray-400" />{b.country} · {b.currency} · {b.payoutMethod}</div>
                {b.network && <p className="text-xs text-gray-400">{b.network}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={() => { setShowAdd(false); reset(); }} title="Add Recipient" size="md">
        <form onSubmit={handleSubmit(onSave)} className="space-y-4 mt-2">
          {[
            { name:'nickname', label:'Nickname', placeholder:'Mom Ghana' },
            { name:'fullName', label:'Full name', placeholder:'Grace Mensah' },
            { name:'msisdn',   label:'Phone (MSISDN)', placeholder:'+233201234567' },
          ].map(f => (
            <div key={f.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <input {...register(f.name)} placeholder={f.placeholder}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${errors[f.name] ? 'border-red-400' : 'border-gray-300'}`} />
              {errors[f.name] && <p className="mt-0.5 text-xs text-red-500">{errors[f.name].message}</p>}
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <select {...register('country')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">Select…</option>
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payout method</label>
              <select {...register('payoutMethod')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="momo">Mobile Money</option>
                <option value="bank">Bank Transfer</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Network <span className="text-gray-400">(optional)</span></label>
            <input {...register('network')} placeholder="MTN, Airtel, Vodafone…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setShowAdd(false); reset(); }}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white rounded-lg text-sm font-semibold transition">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={onDelete}
        title="Remove recipient" message="Are you sure you want to remove this saved recipient?" variant="danger" confirmLabel="Remove" />
    </div>
  );
}
