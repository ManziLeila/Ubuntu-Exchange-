'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Globe, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';

const schema = z.object({
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  confirm:  z.string(),
}).refine(d => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');
  const [showPw, setShowPw] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async ({ password }) => {
    if (!token) { toast.error('Invalid or missing reset token.'); return; }
    try {
      await api.post('/api/v1/auth/reset-password', { token, password });
      toast.success('Password reset! Please sign in.');
      router.push('/login');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Reset failed. The link may have expired.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
        <div className="relative">
          <input {...register('password')} type={showPw ? 'text' : 'password'} placeholder="Min 8 chars, 1 uppercase, 1 number"
            className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 pr-10 ${errors.password ? 'border-red-400' : 'border-gray-300'}`} />
          <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && <p className="mt-1 text-xs text-red-500">Min 8 chars, one uppercase letter, one number.</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
        <input {...register('confirm')} type={showPw ? 'text' : 'password'} placeholder="Repeat password"
          className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${errors.confirm ? 'border-red-400' : 'border-gray-300'}`} />
        {errors.confirm && <p className="mt-1 text-xs text-red-500">{errors.confirm.message}</p>}
      </div>
      <button type="submit" disabled={isSubmitting}
        className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-semibold rounded-lg text-sm transition flex items-center justify-center gap-2">
        {isSubmitting ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Resetting…</> : 'Reset password'}
      </button>
      <p className="text-center text-sm text-gray-500"><Link href="/login" className="text-brand-600 hover:text-brand-700">Back to sign in</Link></p>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl mb-4 shadow-lg">
            <Globe className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Set new password</h1>
          <p className="text-gray-500 mt-1 text-sm">Enter a strong password for your account</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <Suspense fallback={<div className="text-center text-sm text-gray-500">Loading…</div>}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
