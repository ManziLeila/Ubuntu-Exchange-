'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../../lib/api';
import TransactionReceipt from '../../../../components/ui/TransactionReceipt';
import Spinner from '../../../../components/ui/Spinner';

const CORRIDORS = [
  { id:'RWF_GHS', from:'RWF', to:'GHS', label:'Rwanda → Ghana (GHS)' },
  { id:'RWF_UGX', from:'RWF', to:'UGX', label:'Rwanda → Uganda (UGX)' },
  { id:'RWF_KES', from:'RWF', to:'KES', label:'Rwanda → Kenya (KES)' },
  { id:'RWF_USD', from:'RWF', to:'USD', label:'Rwanda → USD (Bank)' },
];

const s1Schema = z.object({
  clientId:   z.string().min(1, 'Select a client'),
  corridor:   z.string().min(1, 'Select corridor'),
  sendAmount: z.coerce.number().positive().min(1000),
});
const s2Schema = z.object({
  recipientName:   z.string().min(2),
  recipientMsisdn: z.string().min(9),
});

export default function AgentNewTransferPage() {
  const router = useRouter();
  const [step, setStep]       = useState(0);
  const [clients, setClients] = useState([]);
  const [rate, setRate]       = useState(null);
  const [s1Data, setS1Data]   = useState(null);
  const [transfer, setTransfer] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const form1 = useForm({ resolver: zodResolver(s1Schema) });
  const form2 = useForm({ resolver: zodResolver(s2Schema) });

  useEffect(() => {
    api.get('/api/v1/agent/clients?limit=100').then(r => {
      const d = r.data.data ?? r.data;
      setClients(Array.isArray(d) ? d : d.clients ?? []);
    }).catch(() => {});
  }, []);

  const corridor = form1.watch('corridor');
  const sendAmount = form1.watch('sendAmount');
  useEffect(() => {
    if (!corridor) return;
    api.get(`/api/v1/forex/rates?corridor=${corridor}`).then(r => setRate(r.data.data ?? r.data)).catch(() => {});
  }, [corridor]);

  const onStep1 = (data) => { setS1Data(data); setStep(1); };

  const onSubmit = async (s2) => {
    setSubmitting(true);
    try {
      const corrObj = CORRIDORS.find(c => c.id === s1Data.corridor);
      const r = await api.post('/api/v1/agent/transfers', {
        clientId:        s1Data.clientId,
        corridor:        s1Data.corridor,
        sendAmount:      Number(s1Data.sendAmount),
        fromCurrency:    corrObj.from,
        toCurrency:      corrObj.to,
        recipientName:   s2.recipientName,
        recipientMsisdn: s2.recipientMsisdn,
        payoutMethod:    corrObj.to === 'USD' ? 'bank' : 'momo',
      });
      setTransfer(r.data.data ?? r.data);
      setStep(2);
      toast.success('Transfer submitted!');
    } catch (err) { toast.error(err?.response?.data?.message ?? 'Failed.'); }
    finally { setSubmitting(false); }
  };

  const corrObj = CORRIDORS.find(c => c.id === (s1Data?.corridor ?? corridor));
  const receiveAmt = rate && sendAmount ? (Number(sendAmount) * rate.clientRate).toFixed(2) : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => step > 0 ? setStep(s => s - 1) : router.push('/agent/transfers')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">New Transfer — Step {step + 1} of 3</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        {step === 0 && (
          <form onSubmit={form1.handleSubmit(onStep1)} className="space-y-5">
            <h2 className="text-lg font-semibold">Select client & corridor</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
              <select {...form1.register('clientId')} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">Select client…</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.email}</option>)}
              </select>
              {form1.formState.errors.clientId && <p className="mt-1 text-xs text-red-500">{form1.formState.errors.clientId.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Corridor</label>
              <select {...form1.register('corridor')} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">Select corridor…</option>
                {CORRIDORS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount to send (RWF)</label>
              <input {...form1.register('sendAmount')} type="number" min={1000} placeholder="100,000"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            {rate && receiveAmt && (
              <div className="bg-brand-50 rounded-xl p-4 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-gray-600">Rate</span><span>1 {corrObj?.from} = {rate.clientRate} {corrObj?.to}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Recipient gets</span><span className="font-semibold text-brand-700">~{Number(receiveAmt).toLocaleString()} {corrObj?.to}</span></div>
              </div>
            )}
            <button type="submit" className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2">
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {step === 1 && (
          <form onSubmit={form2.handleSubmit(onSubmit)} className="space-y-5">
            <h2 className="text-lg font-semibold">Recipient details</h2>
            <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-gray-500">Amount</span><span className="font-medium">{Number(s1Data.sendAmount).toLocaleString()} {corrObj?.from}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Corridor</span><span>{s1Data.corridor}</span></div>
            </div>
            {[{ name:'recipientName', label:'Recipient name', placeholder:'Grace Mensah' },
              { name:'recipientMsisdn', label:'Recipient phone', placeholder:'+233201234567' }].map(f => (
              <div key={f.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                <input {...form2.register(f.name)} placeholder={f.placeholder}
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${form2.formState.errors[f.name] ? 'border-red-400' : 'border-gray-300'}`} />
              </div>
            ))}
            <button type="submit" disabled={submitting}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-semibold rounded-xl flex items-center justify-center gap-2">
              {submitting ? <><Spinner size="sm" /> Submitting…</> : <><CheckCircle className="w-4 h-4" /> Submit Transfer</>}
            </button>
          </form>
        )}

        {step === 2 && transfer && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-9 h-9 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Transfer submitted!</h2>
            </div>
            <TransactionReceipt transfer={transfer} />
            <div className="flex gap-3">
              <button onClick={() => router.push('/agent/transfers')} className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50">View All</button>
              <button onClick={() => { setStep(0); form1.reset(); form2.reset(); setTransfer(null); setS1Data(null); }}
                className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold">New Transfer</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
