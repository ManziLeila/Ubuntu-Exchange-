'use client';

import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const typeConfig = {
  success: {
    icon: CheckCircle2,
    container: 'bg-green-50 border-green-200',
    icon: CheckCircle2,
    iconClass: 'text-green-500',
    titleClass: 'text-green-800',
    messageClass: 'text-green-700',
    closeClass: 'text-green-400 hover:text-green-600',
  },
  error: {
    icon: XCircle,
    container: 'bg-red-50 border-red-200',
    iconClass: 'text-red-500',
    titleClass: 'text-red-800',
    messageClass: 'text-red-700',
    closeClass: 'text-red-400 hover:text-red-600',
  },
  warning: {
    icon: AlertTriangle,
    container: 'bg-yellow-50 border-yellow-200',
    iconClass: 'text-yellow-500',
    titleClass: 'text-yellow-800',
    messageClass: 'text-yellow-700',
    closeClass: 'text-yellow-400 hover:text-yellow-600',
  },
  info: {
    icon: Info,
    container: 'bg-blue-50 border-blue-200',
    iconClass: 'text-blue-500',
    titleClass: 'text-blue-800',
    messageClass: 'text-blue-700',
    closeClass: 'text-blue-400 hover:text-blue-600',
  },
};

export default function Alert({ type = 'info', title, message, onClose }) {
  const config = typeConfig[type] ?? typeConfig.info;
  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={[
        'flex gap-3 p-4 rounded-xl border',
        config.container,
      ].join(' ')}
    >
      <Icon className={['w-5 h-5 shrink-0 mt-0.5', config.iconClass].join(' ')} />
      <div className="flex-1 min-w-0">
        {title && (
          <p className={['text-sm font-semibold', config.titleClass].join(' ')}>
            {title}
          </p>
        )}
        {message && (
          <p className={['text-sm mt-0.5', config.messageClass].join(' ')}>
            {message}
          </p>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className={[
            'p-0.5 rounded shrink-0 transition-colors focus:outline-none',
            config.closeClass,
          ].join(' ')}
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
