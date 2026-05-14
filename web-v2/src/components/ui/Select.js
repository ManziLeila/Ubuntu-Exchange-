'use client';

import { ChevronDown } from 'lucide-react';

export default function Select({
  label,
  error,
  options = [],
  placeholder = 'Select an option',
  id,
  className = '',
  ...props
}) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  const base =
    'block w-full rounded-lg border bg-white text-sm text-gray-900 pl-3 pr-9 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors duration-150 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed';

  const stateClass = error
    ? 'border-red-400 focus:border-red-500 focus:ring-red-300'
    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200';

  const selectClasses = [base, stateClass, className].filter(Boolean).join(' ');

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={selectClasses}
          aria-invalid={!!error}
          aria-describedby={error ? `${selectId}-error` : undefined}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-gray-400">
          <ChevronDown className="w-4 h-4" />
        </span>
      </div>
      {error && (
        <p id={`${selectId}-error`} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
