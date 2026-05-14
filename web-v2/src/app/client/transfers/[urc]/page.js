'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { api } from '../../../../lib/api';
import TransactionReceipt from '../../../../components/ui/TransactionReceipt';
import Badge from '../../../../components/ui/Badge';
import Spinner from '../../../../components/ui/Spinner';

const STATUS_BADGE = { PENDING:'pending', OTP_PENDING:'pending', PROCESSING:'info', COMPLETED:'success', FAILED:'danger', CANCELLED:'default', FLAGGED:'warning' };

export default function TransferDetailPage() {
  const { urc } = useParams();
  const [tx, setTx]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/v1/transfers/urc/${urc}`)
      .then(r => setTx(r.data.data ?? r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [urc]);

  if (loading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
  if (!tx)     return <div className="text-center py-16 text-gray-400">Transfer not found.</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/client/transfers" className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Transfer {tx.urc}</h1>
          <Badge variant={STATUS_BADGE[tx.status] ?? 'default'}>{tx.status}</Badge>
        </div>
      </div>
      <TransactionReceipt transfer={tx} />
    </div>
  );
}
