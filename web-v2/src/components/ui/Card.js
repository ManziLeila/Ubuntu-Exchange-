'use client';

export default function Card({
  title,
  description,
  footer,
  className = '',
  children,
}) {
  return (
    <div
      className={[
        'rounded-xl bg-white shadow-sm border border-gray-200 p-6',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          )}
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
      )}

      <div>{children}</div>

      {footer && (
        <div className="mt-4 pt-4 border-t border-gray-100">{footer}</div>
      )}
    </div>
  );
}
