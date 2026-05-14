'use client';

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-[3px]',
};

const colorClasses = {
  blue: 'border-blue-200 border-t-blue-600',
  gray: 'border-gray-200 border-t-gray-600',
  white: 'border-white/30 border-t-white',
  red: 'border-red-200 border-t-red-600',
  green: 'border-green-200 border-t-green-600',
};

export default function Spinner({ size = 'md', color = 'blue', className = '' }) {
  const classes = [
    'animate-spin rounded-full',
    sizeClasses[size] ?? sizeClasses.md,
    colorClasses[color] ?? colorClasses.blue,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <span className={classes} role="status" aria-label="Loading" />;
}
