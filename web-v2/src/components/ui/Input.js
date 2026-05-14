'use client';

export default function Input({
  label,
  error,
  hint,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  type = 'text',
  id,
  className = '',
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  const inputBase =
    'block w-full rounded-lg border bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors duration-150 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed';

  const inputState = error
    ? 'border-red-400 focus:border-red-500 focus:ring-red-300'
    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200';

  const paddingLeft = LeftIcon ? 'pl-9' : 'pl-3';
  const paddingRight = RightIcon ? 'pr-9' : 'pr-3';
  const inputClasses = [inputBase, inputState, paddingLeft, paddingRight, 'py-2', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {LeftIcon && (
          <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-gray-400">
            <LeftIcon className="w-4 h-4" />
          </span>
        )}
        <input
          id={inputId}
          type={type}
          className={inputClasses}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          {...props}
        />
        {RightIcon && (
          <span className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-gray-400">
            <RightIcon className="w-4 h-4" />
          </span>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="mt-1 text-xs text-gray-500">
          {hint}
        </p>
      )}
    </div>
  );
}
