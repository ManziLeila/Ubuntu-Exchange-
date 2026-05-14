'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, ArrowLeft, Send, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import OtpInput from '../../../components/ui/OtpInput';
import TransactionReceipt from '../../../components/ui/TransactionReceipt';
import Spinner from '../../../components/ui/Spinner';

// ── Corridors ────────────────────────────────────────────────────────────────
const CORRIDORS = [
  { id: 'RWF_GHS', from: 'RWF', to: 'GHS', fromLabel: 'Rwanda (RWF)', toLabel: 'Ghana (GHS)',   method: 'momo' },
  { id: 'RWF_UGX', from: 'RWF', to: 'UGX', fromLabel: 'Rwanda (RWF)', toLabel: 'Uganda (UGX)',  method: 'momo' },
  { id: 'RWF_KES', from: 'RWF', to: 'KES', fromLabel: 'Rwanda (RWF)', toLabel: 'Kenya (KES)',   method: 'momo' },
  { id: 'RWF_USD', from: 'RWF', to: 'USD', fromLabel: 'Rwanda (RWF)', toLabel: 'USD (Bank)',    method: 'bank' },
];

// ── Step 1 schema ─────────────────────────────────────────────────────────────
const step1Schema = z.object({
  corridor:    z.string().min(1, 'Select a corridor'),
  sendAmount:  z.coerce.number().positive('Enter a valid amount').min(1000, 'Minimum is 1,000 RWF'),
  note:        z.string().max(100).optional(),
});

// ── Step 2 schema ─────────────────────────────────────────────────────────────
const step2Schema = z.object({
  recipientName:  z.string().min(2, 'Enter recipient full name'),
  recipientMsisdn: z.string().min(9, 'Enter a valid phone number'),
  recipientNetwork: z.string().optional(),
});

const STEPS = ['Corridor & Amount', 'Recipient', 'Confirm & OTP', 'Receipt'];

export default function SendPage() {
  const router = useRouter();
  const [step, setStep]           = useState(0);
  const [rate, setRate]           = useState(null);
  const [otpId, setOtpId]         = useState(null);
  const [otp, setOtp]             = useState('');
  const [transfer, setTransfer]   = useState(null);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loadingRate, setLoadingRate]     = useState(false);

  // Step 1 data
  const [s1Data, setS1Data] = useState(null);
  // Step 2 data
  const [s2Data, setS2Data] = useState(null);

  const form1 = useForm({ resolver: zodResolver(step1Schema), defaultValues: { corridor: '', sendAmount: '' } });
  const form2 = useForm({ resolver: zodResolver(step2Schema) });

  // Load beneficiaries
  useEffect(() => {
    api.get('/api/v1/beneficiaries').then(r => setBeneficiaries(r.data.data ?? [])).catch(() => {});
  }, []);

  // Fetch rate when corridor changes
  const selectedCorridor = form1.watch('corridor');
  useEffect(() => {
    if (!selectedCorridor) return;
    setLoadingRate(true);
    api.get(`/api/v1/forex/rates?corridor=${selectedCorridor}`)
      .then(r => setRate(r.data.data ?? r.data))
      .catch(() => setRate(null))
      .finally(() => setLoadingRate(false));
  }, [selectedCorridor]);

  const sendAmount = form1.watch('sendAmount');
  const receiveAmount = rate && sendAmount ? (Number(sendAmount) * rate.clientRate).toFixed(2) : null;
  const fee = rate && sendAmount ? Math.max(500, Number(sendAmount) * 0.01).toFixed(0) : null;
  const corridorObj = CORRIDORS.find(c => c.id === selectedCorridor);

  // Step 1 submit
  const onStep1 = (data) => {
    setS1Data(data);
    setStep(1);
  };

  // Step 2 submit
  const onStep2 = (data) => {
    setS2Data(data);
    setStep(2);
  };

  // Fill from beneficiary
  const fillBeneficiary = (b) => {
    form2.setValue('recipientName', b.fullName);
    form2.setValue('recipientMsisdn', b.msisdn);
    form2.setValue('recipientNetwork', b.network ?? '');
  };

  // Request OTP and submit transfer
  const requestOtpAndConfirm = async () => {
    try {
      // Create transfer
      const txRes = await api.post('/api/v1/transfers', {
        corridor:        s1Data.corridor,
        sendAmount:      Number(s1Data.sendAmount),
        fromCurrency:    corridorObj.from,
        toCurrency:      corridorObj.to,
        recipientName:   s2Data.recipientName,
        recipientMsisdn: s2Data.recipientMsisdn,
        payoutMethod:    corridorObj.method,
        note:            s1Data.note,
      });
      const tx = txRes.data.data ?? txRes.data;
      // Request OTP
      const otpRes = await api.post('/api/v1/otp/request', { purpose: 'transfer_confirm', reference: tx.id });
      setOtpId(otpRes.data.data?.otpId ?? otpRes.data.otpId);
      setTransfer(tx);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to initiate transfer.');
    }
  };

  // Verify OTP and finalize
  const verifyOtp = async () => {
    if (!otpId) { toast.error('No OTP request found.'); return; }
    try {
      await api.post('/api/v1/otp/verify', { otpId, code: otp, purpose: 'transfer_confirm' });
      // Approve transfer
      await api.post(`/api/v1/transfers/${transfer.id}/confirm-otp`);
      const freshTx = await api.get(`/api/v1/transfers/urc/${transfer.urc}`);
      setTransfer(freshTx.data.data ?? freshTx.data);
      setStep(3);
      toast.success('Transfer submitted successfully!');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'OTP verification failed.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Send Money</h1>
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition ${
                i < step ? 'bg-green-500 text-white' : i === step ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-sm hidden sm:block ${i === step ? 'font-semibold text-gray-900' : 'text-gray-400'}`}>{label}</span>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 w-8 ${i < step ? 'bg-green-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        {/* ── Step 0: Corridor & Amount ─── */}
        {step === 0 && (
          <form onSubmit={form1.handleSubmit(onStep1)} className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Select corridor & amount</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Send from → Receive in</label>
              <select {...form1.register('corridor')}
                className={`w-full px-4 py-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 ${form1.formState.errors.corridor ? 'border-red-400' : 'border-gray-300'}`}>
                <option value="">Choose corridor…</option>
                {CORRIDORS.map(c => <option key={c.id} value={c.id}>{c.fromLabel} → {c.toLabel}</option>)}
              </select>
              {form1.formState.errors.corridor && <p className="mt-1 text-xs text-red-500">{form1.formState.errors.corridor.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount to send (RWF)</label>
              <input {...form1.register('sendAmount')} type="number" min={1000} placeholder="100,000"
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${form1.formState.errors.sendAmount ? 'border-red-400' : 'border-gray-300'}`} />
              {form1.formState.errors.sendAmount && <p className="mt-1 text-xs text-red-500">{form1.formState.errors.sendAmount.message}</p>}
            </div>

            {/* Rate preview */}
            {loadingRate && <div className="flex items-center gap-2 text-sm text-gray-500"><Spinner size="sm" /> Fetching rate…</div>}
            {rate && receiveAmount && !loadingRate && (
              <div className="bg-brand-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Exchange rate</span><span className="font-medium">1 {corridorObj?.from} = {rate.clientRate} {corridorObj?.to}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Recipient gets</span><span className="font-semibold text-brand-700">{Number(receiveAmount).toLocaleString()} {corridorObj?.to}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Fee</span><span className="font-medium">{Number(fee).toLocaleString()} RWF</span></div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note <span className="text-gray-400">(optional)</span></label>
              <input {...form1.register('note')} type="text" placeholder="e.g. School fees"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>

            <button type="submit" className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition">
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* ── Step 1: Recipient ─── */}
        {step === 1 && (
          <form onSubmit={form2.handleSubmit(onStep2)} className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Recipient details</h2>

            {beneficiaries.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Select saved recipient</p>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                  {beneficiaries.map(b => (
                    <button key={b.id} type="button" onClick={() => fillBeneficiary(b)}
                      className="text-left px-3 py-2 border border-gray-200 rounded-lg text-sm hover:border-brand-400 hover:bg-brand-50 transition">
                      <p className="font-medium truncate">{b.nickname}</p>
                      <p className="text-gray-400 text-xs">{b.msisdn}</p>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">Or enter manually below</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recipient full name</label>
              <input {...form2.register('recipientName')} type="text" placeholder="Grace Mensah"
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${form2.formState.errors.recipientName ? 'border-red-400' : 'border-gray-300'}`} />
              {form2.formState.errors.recipientName && <p className="mt-1 text-xs text-red-500">{form2.formState.errors.recipientName.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recipient phone (MSISDN)</label>
              <input {...form2.register('recipientMsisdn')} type="tel" placeholder="+233201234567"
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${form2.formState.errors.recipientMsisdn ? 'border-red-400' : 'border-gray-300'}`} />
              {form2.formState.errors.recipientMsisdn && <p className="mt-1 text-xs text-red-500">{form2.formState.errors.recipientMsisdn.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Network <span className="text-gray-400">(optional)</span></label>
              <select {...form2.register('recipientNetwork')} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">Any / auto-detect</option>
                <option value="MTN">MTN MoMo</option>
                <option value="Airtel">Airtel Money</option>
                <option value="Vodafone">Vodafone Cash</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(0)}
                className="flex-1 py-3 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl flex items-center justify-center gap-2 transition">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button type="submit"
                className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition">
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* ── Step 2: Confirm & OTP ─── */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Confirm & verify</h2>

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">You send</span><span className="font-semibold">{Number(s1Data?.sendAmount).toLocaleString()} {corridorObj?.from}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Recipient gets</span><span className="font-semibold text-green-700">{receiveAmount ? `~${Number(receiveAmount).toLocaleString()} ${corridorObj?.to}` : '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">To</span><span className="font-medium">{s2Data?.recipientName} · {s2Data?.recipientMsisdn}</span></div>
              {s1Data?.note && <div className="flex justify-between"><span className="text-gray-500">Note</span><span>{s1Data.note}</span></div>}
            </div>

            {!otpId ? (
              <button onClick={requestOtpAndConfirm}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition">
                <Send className="w-4 h-4" /> Submit & send OTP
              </button>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 text-center">Enter the 6-digit code sent to your phone to confirm this transfer.</p>
                <div className="flex justify-center">
                  <OtpInput length={6} value={otp} onChange={setOtp} autoFocus />
                </div>
                <button onClick={verifyOtp} disabled={otp.length < 6}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition">
                  <CheckCircle className="w-4 h-4" /> Confirm transfer
                </button>
                <button onClick={() => { setOtpId(null); setOtp(''); setStep(1); }}
                  className="w-full py-2 text-sm text-gray-500 hover:text-gray-700">← Go back</button>
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Receipt ─── */}
        {step === 3 && transfer && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-9 h-9 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Transfer submitted!</h2>
              <p className="text-sm text-gray-500 mt-1">Your transfer is being processed.</p>
            </div>
            <TransactionReceipt transfer={transfer} />
            <div className="flex gap-3">
              <button onClick={() => router.push('/client/dashboard')}
                className="flex-1 py-3 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl transition">
                Back to dashboard
              </button>
              <button onClick={() => { setStep(0); form1.reset(); form2.reset(); setOtpId(null); setOtp(''); setTransfer(null); setS1Data(null); setS2Data(null); }}
                className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition">
                Send another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
