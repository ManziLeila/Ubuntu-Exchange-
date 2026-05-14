'use client';

const variantClasses = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  pending: 'bg-purple-100 text-purple-700',
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

export default function Badge({
  variant = 'default',
  size = 'md',
  className = '',
  children,
}) {
  const classes = [
    'inline-flex items-center font-medium rounded-full',
    variantClasses[variant] ?? variantClasses.default,
    sizeClasses[size] ?? sizeClasses.md,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <span className={classes}>{children}</span>;
}
