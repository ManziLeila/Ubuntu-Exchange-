'use client';

import { Printer, CheckCircle2, Clock, XCircle } from 'lucide-react';
import Badge from './Badge';
import Button from './Button';

const statusMap = {
  completed: { variant: 'success', label: 'Completed', icon: CheckCircle2 },
  pending: { variant: 'pending', label: 'Pending', icon: Clock },
  failed: { variant: 'danger', label: 'Failed', icon: XCircle },
  processing: { variant: 'info', label: 'Processing', icon: Clock },
};

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function Row({ label, value, bold = false }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span
        className={[
          'text-sm text-right',
          bold ? 'font-semibold text-gray-900' : 'text-gray-700',
        ].join(' ')}
      >
        {value ?? '—'}
      </span>
    </div>
  );
}

export default function TransactionReceipt({ transfer }) {
  if (!transfer) return null;

  const statusInfo = statusMap[transfer.status] ?? {
    variant: 'default',
    label: transfer.status ?? 'Unknown',
    icon: Clock,
  };
  const StatusIcon = statusInfo.icon;

  function handlePrint() {
    window.print();
  }

  return (
    <div className="max-w-md mx-auto print:max-w-full" id="transaction-receipt">
      {/* Receipt card */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden print:shadow-none print:border-gray-300">
        {/* Header */}
        <div className="bg-blue-600 px-6 py-5 text-white print:bg-white print:text-gray-900 print:border-b print:border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest opacity-80 print:text-gray-500">
                Transaction Receipt
              </p>
              <h2 className="text-xl font-bold mt-0.5">
                {transfer.amount} {transfer.fromCurrency}
              </h2>
            </div>
            <StatusIcon className="w-8 h-8 opacity-90 print:text-gray-600" />
          </div>
          <Badge
            variant={statusInfo.variant}
            size="sm"
            className="mt-3 print:mt-2"
          >
            {statusInfo.label}
          </Badge>
        </div>

        {/* Body rows */}
        <div className="px-6 py-2">
          <Row label="Reference ID" value={transfer.id} />
          <Row label="URC" value={transfer.urc} bold />
          <Row label="Sender" value={transfer.senderName} />
          <Row label="Recipient" value={transfer.recipient} />
          <Row label="Corridor" value={transfer.corridor} />
          <Row
            label="Amount Sent"
            value={`${transfer.amount} ${transfer.fromCurrency}`}
            bold
          />
          <Row
            label="Recipient Gets"
            value={`${transfer.toAmount} ${transfer.toCurrency}`}
            bold
          />
          <Row label="Exchange Rate" value={transfer.rate} />
          <Row
            label="Fee"
            value={
              transfer.fee != null
                ? `${transfer.fee} ${transfer.fromCurrency}`
                : undefined
            }
          />
          <Row label="Date" value={formatDate(transfer.createdAt)} />
        </div>
      </div>

      {/* Print button (hidden in print) */}
      <div className="mt-4 flex justify-end print:hidden">
        <Button
          variant="outline"
          size="md"
          onClick={handlePrint}
        >
          <Printer className="w-4 h-4" />
          Print Receipt
        </Button>
      </div>
    </div>
  );
}
