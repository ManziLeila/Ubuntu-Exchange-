'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import Spinner from './Spinner';

export default function StatCard({
  label,
  value,
  change,
  icon: Icon,
  loading = false,
}) {
  const isPositive = change > 0;
  const isNeutral = change === 0 || change == null;

  return (
    <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-5 flex flex-col gap-3">
      {/* Top row: label + icon */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        {Icon && (
          <span style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(201,168,112,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={17} color="#c9a870" />
          </span>
        )}
      </div>

      {/* Value */}
      {loading ? (
        <Spinner size="sm" />
      ) : (
        <span className="text-2xl font-bold text-gray-900 tracking-tight">
          {value}
        </span>
      )}

      {/* Change */}
      {!loading && !isNeutral && (
        <div
          className={[
            'flex items-center gap-1 text-xs font-medium',
            isPositive ? 'text-green-600' : 'text-red-600',
          ].join(' ')}
        >
          {isPositive ? (
            <TrendingUp className="w-3.5 h-3.5" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5" />
          )}
          <span>
            {isPositive ? '+' : ''}
            {change}%
          </span>
          <span className="text-gray-400 font-normal">vs last period</span>
        </div>
      )}
    </div>
  );
}
