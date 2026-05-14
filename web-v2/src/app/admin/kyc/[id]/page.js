'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { ArrowLeft, FileText, Image } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../../lib/api';
import Badge from '../../../../components/ui/Badge';
import Spinner from '../../../../components/ui/Spinner';

const STATUS_BADGE = { APPROVED:'success', UNDER_REVIEW:'info', REJECTED:'danger', PENDING:'warning', REQUIRES_DOCS:'warning' };

export default function AdminKycReviewPage() {
  const { id } = useParams();
  const router = useRouter();
  const [app, setApp]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    api.get(`/api/v1/kyc/admin/applications/${id}`)
      .then(r => setApp(r.data.data ?? r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const onReview = async (data) => {
    setSubmitting(true);
    try {
      await api.post(`/api/v1/kyc/admin/applications/${id}/review`, data);
      toast.success(`Application ${data.decision.toLowerCase()}.`);
      router.push('/admin/kyc');
    } catch (err) { toast.error(err?.response?.data?.message ?? 'Failed.'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (!app) return <div className="text-center py-16 text-gray-400">Application not found.</div>;

  const docs = app.documents ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">KYC Review — {app.user?.name}</h1>
          <Badge variant={STATUS_BADGE[app.status] ?? 'default'}>{app.status}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: documents + OCR */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Applicant Info</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[['Name', app.user?.name], ['Email', app.user?.email], ['Phone', app.user?.msisdn ?? '—'], ['Country', app.user?.country], ['Risk Score', app.riskScore ?? '—'], ['Overall', app.overallResult ?? '—']].map(([k,v]) => (
                <div key={k}><p className="text-xs text-gray-500">{k}</p><p className="font-medium text-gray-900">{v}</p></div>
              ))}
            </div>
          </div>

          {docs.map(doc => {
            const ocr = doc.ocrData ? (typeof doc.ocrData === 'string' ? JSON.parse(doc.ocrData) : doc.ocrData) : null;
            const isImg = doc.mimeType?.startsWith('image/');
            return (
              <div key={doc.id} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isImg ? <Image className="w-4 h-4 text-gray-500" /> : <FileText className="w-4 h-4 text-gray-500" />}
                    <span className="text-sm font-medium capitalize">{doc.documentType?.replace('_',' ')}</span>
                  </div>
                  <Badge variant={doc.status === 'APPROVED' ? 'success' : doc.status === 'REJECTED' ? 'danger' : 'info'} size="sm">{doc.status}</Badge>
                </div>
                {isImg && (
                  <img src={`/uploads/${doc.filePath}`} alt={doc.documentType} className="w-full rounded-lg border border-gray-100 max-h-48 object-contain bg-gray-50" />
                )}
                {doc.faceMatchScore != null && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Face match score</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all ${doc.faceMatchScore >= 0.8 ? 'bg-green-500' : doc.faceMatchScore >= 0.5 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${doc.faceMatchScore * 100}%` }} />
                    </div>
                    <p className="text-xs text-right text-gray-600 mt-0.5">{(doc.faceMatchScore * 100).toFixed(0)}%</p>
                  </div>
                )}
                {ocr && (
                  <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
                    <p className="font-medium text-gray-700 mb-1">OCR Data</p>
                    {Object.entries(ocr).map(([k,v]) => (
                      <div key={k} className="flex justify-between"><span className="text-gray-500 capitalize">{k.replace('_',' ')}</span><span className="font-medium">{String(v)}</span></div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: review form */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5 h-fit">
          <h2 className="font-semibold text-gray-900">Review Decision</h2>
          {['APPROVED','REJECTED'].includes(app.status) ? (
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
              This application has already been reviewed.<br />
              <span className="font-medium">Decision: {app.status}</span>
              {app.reviewNotes && <p className="mt-1">{app.reviewNotes}</p>}
            </div>
          ) : (
            <form onSubmit={handleSubmit(onReview)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Decision</label>
                <select {...register('decision', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">Select decision…</option>
                  <option value="APPROVED">Approve</option>
                  <option value="REJECTED">Reject</option>
                  <option value="REQUIRES_DOCS">Requires More Docs</option>
                </select>
                {errors.decision && <p className="mt-0.5 text-xs text-red-500">Required</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea {...register('notes')} rows={3} placeholder="Internal review notes…"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rejection reason <span className="text-gray-400">(if rejecting)</span></label>
                <input {...register('rejectionReason')} placeholder="e.g. Document expired"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <button type="submit" disabled={submitting}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-semibold rounded-xl text-sm transition">
                {submitting ? 'Submitting…' : 'Submit Decision'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
