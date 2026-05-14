'use client';

import { formatDistanceToNow, parseISO, differenceInMinutes } from 'date-fns';
import { RefreshCw, AlertTriangle, ArrowRight } from 'lucide-react';

export default function RateWidget({
  fromCurrency,
  toCurrency,
  rate,
  fetchedAt,
  onRefresh,
}) {
  let fetchedDate = null;
  let isStale = false;
  let relativeTime = '';

  try {
    fetchedDate = parseISO(fetchedAt);
    const minutesOld = differenceInMinutes(new Date(), fetchedDate);
    isStale = minutesOld > 5;
    relativeTime = formatDistanceToNow(fetchedDate, { addSuffix: true });
  } catch {
    // invalid date — treat as stale
    isStale = true;
  }

  return (
    <div
      className={[
        'rounded-xl border p-4 flex flex-col gap-3 transition-colors duration-200',
        isStale
          ? 'bg-yellow-50 border-yellow-200'
          : 'bg-white border-gray-200',
      ].join(' ')}
    >
      {/* Rate display */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          {fromCurrency}
        </span>
        <ArrowRight className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          {toCurrency}
        </span>
        <span className="ml-auto text-xl font-bold text-gray-900">
          {rate != null ? rate : '—'}
        </span>
      </div>

      {/* Staleness warning */}
      {isStale && (
        <div className="flex items-start gap-1.5 text-xs text-yellow-700">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Rate may be outdated
            {relativeTime ? ` — fetched ${relativeTime}` : ''}.
            Please refresh.
          </span>
        </div>
      )}

      {/* Footer: last fetched + refresh */}
      <div className="flex items-center justify-between">
        {!isStale && relativeTime && (
          <span className="text-xs text-gray-400">
            Updated {relativeTime}
          </span>
        )}
        {!isStale && !relativeTime && <span />}

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className={[
              'inline-flex items-center gap-1 text-xs font-medium rounded-lg px-2.5 py-1 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1',
              isStale
                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 focus:ring-yellow-400'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 focus:ring-gray-300',
            ].join(' ')}
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        )}
      </div>
    </div>
  );
}
