'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
export const NotificationContext = createContext(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function NotificationProvider({ children }) {
  const { token, isLoading: authLoading } = useAuth();
  const { socket } = useSocket();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Prevent duplicate fetches in StrictMode
  const fetchedRef = useRef(false);

  // -------------------------------------------------------------------------
  // fetchNotifications — loads both list and unread count in parallel
  // -------------------------------------------------------------------------
  const fetchNotifications = useCallback(async () => {
    try {
      const [listRes, unreadRes] = await Promise.all([
        api.get('/api/v1/notifications'),
        api.get('/api/v1/notifications/unread'),
      ]);

      // Support both { data: [...] } and plain array responses
      const list = listRes.data?.data ?? listRes.data ?? [];
      const count =
        unreadRes.data?.count ??
        unreadRes.data?.unreadCount ??
        (Array.isArray(unreadRes.data) ? unreadRes.data.length : 0);

      setNotifications(list);
      setUnreadCount(count);
    } catch (err) {
      console.error('[NotificationContext] Failed to fetch notifications:', err?.message);
    }
  }, []);

  // -------------------------------------------------------------------------
  // Mount — fetch when authenticated
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (authLoading) return;

    if (token) {
      if (!fetchedRef.current) {
        fetchedRef.current = true;
        fetchNotifications();
      }
    } else {
      // User logged out — reset state
      fetchedRef.current = false;
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [token, authLoading, fetchNotifications]);

  // -------------------------------------------------------------------------
  // Socket listener — real-time new notifications
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!socket) return;

    function onNewNotification(notification) {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    }

    socket.on('notification:new', onNewNotification);

    return () => {
      socket.off('notification:new', onNewNotification);
    };
  }, [socket]);

  // -------------------------------------------------------------------------
  // markRead(id)
  // -------------------------------------------------------------------------
  const markRead = useCallback(async (id) => {
    try {
      await api.post(`/api/v1/notifications/${id}/read`);

      setNotifications((prev) =>
        prev.map((n) => (n.id === id || n._id === id ? { ...n, read: true } : n)),
      );

      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(`[NotificationContext] Failed to mark notification ${id} as read:`, err?.message);
      throw err;
    }
  }, []);

  // -------------------------------------------------------------------------
  // markAllRead
  // -------------------------------------------------------------------------
  const markAllRead = useCallback(async () => {
    try {
      await api.post('/api/v1/notifications/read-all');

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[NotificationContext] Failed to mark all notifications as read:', err?.message);
      throw err;
    }
  }, []);

  // -------------------------------------------------------------------------
  // Context value
  // -------------------------------------------------------------------------
  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      fetchNotifications,
      markRead,
      markAllRead,
    }),
    [notifications, unreadCount, fetchNotifications, markRead, markAllRead],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a <NotificationProvider>.');
  }
  return ctx;
}
