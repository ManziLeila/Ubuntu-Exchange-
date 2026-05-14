'use client';

import { useState, useEffect } from 'react';
import { X, CheckCheck, Bell, AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from '../../contexts/NotificationContext';
import Pagination from '../ui/Pagination';
import clsx from 'clsx';

const PAGE_SIZE = 10;

const TYPE_CONFIG = {
  success: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  error:   { icon: XCircle,     color: 'text-red-500',     bg: 'bg-red-50'     },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50'   },
  info:    { icon: Info,         color: 'text-blue-500',   bg: 'bg-blue-50'    },
  default: { icon: Bell,         color: 'text-gray-400',   bg: 'bg-gray-100'   },
};

function NotificationIcon({ type }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.default;
  const Icon = cfg.icon;
  return (
    <div className={clsx('flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center', cfg.bg)}>
      <Icon size={15} className={cfg.color} />
    </div>
  );
}

export default function NotificationDrawer({ isOpen, onClose }) {
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications();
  const [page, setPage] = useState(1);

  // Reset to page 1 whenever drawer opens
  useEffect(() => {
    if (isOpen) setPage(1);
  }, [isOpen]);

  const totalPages = Math.max(1, Math.ceil(notifications.length / PAGE_SIZE));
  const paged = notifications.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={clsx(
          'fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Notifications drawer"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-800">Notifications</h2>
            {unreadCount > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors px-2 py-1 rounded hover:bg-brand-50"
              >
                <CheckCheck size={13} />
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close notifications"
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {paged.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
              <Bell size={36} className="opacity-30" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {paged.map((n) => (
                <li
                  key={n.id}
                  onClick={() => !n.read && markRead && markRead(n.id)}
                  className={clsx(
                    'flex items-start gap-3 px-5 py-4 hover:bg-gray-50 transition-colors cursor-default',
                    !n.read && 'bg-brand-50/60'
                  )}
                >
                  <NotificationIcon type={n.type} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={clsx('text-sm font-medium truncate', !n.read ? 'text-gray-900' : 'text-gray-700')}>
                        {n.title}
                      </p>
                      {!n.read && (
                        <span className="flex-shrink-0 mt-1.5 h-2 w-2 rounded-full bg-brand-600" />
                      )}
                    </div>
                    {n.body && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-3">{n.body}</p>
                    )}
                    <p className="text-[11px] text-gray-400 mt-1.5">
                      {formatDistanceToNow(new Date(n.createdAt || n.timestamp || Date.now()), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-100 px-5 py-3">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </>
  );
}
