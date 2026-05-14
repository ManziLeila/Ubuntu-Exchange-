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
import { getSocket, disconnectSocket } from '@/lib/socket';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
export const SocketContext = createContext(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function SocketProvider({ children }) {
  const { token, isLoading } = useAuth();

  /** @type {[import('socket.io-client').Socket | null, Function]} */
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  // Keep a stable ref so event handlers always see the latest socket
  const socketRef = useRef(null);

  // -------------------------------------------------------------------------
  // Connect / disconnect whenever authentication state changes
  // -------------------------------------------------------------------------
  useEffect(() => {
    // Wait until the auth context has finished loading
    if (isLoading) return;

    if (token) {
      // Authenticated — establish / reuse the socket connection
      let sock;
      try {
        sock = getSocket();
      } catch (err) {
        console.error('[SocketContext] Failed to get socket:', err.message);
        return;
      }

      socketRef.current = sock;
      setSocket(sock);
      setConnected(sock.connected);

      const onConnect = () => setConnected(true);
      const onDisconnect = () => setConnected(false);

      sock.on('connect', onConnect);
      sock.on('disconnect', onDisconnect);

      // Clean up event listeners (but keep the connection alive)
      return () => {
        sock.off('connect', onConnect);
        sock.off('disconnect', onDisconnect);
      };
    } else {
      // Not authenticated — tear down the connection
      disconnectSocket();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
    }
  }, [token, isLoading]);

  // -------------------------------------------------------------------------
  // Tear down on unmount
  // -------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, []);

  // -------------------------------------------------------------------------
  // Stable emit helper (avoids consumers holding stale socket refs)
  // -------------------------------------------------------------------------
  const emit = useCallback((event, ...args) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, ...args);
    } else {
      console.warn(`[SocketContext] Cannot emit "${event}" — socket not connected.`);
    }
  }, []);

  // -------------------------------------------------------------------------
  // Context value
  // -------------------------------------------------------------------------
  const value = useMemo(
    () => ({ socket, connected, emit }),
    [socket, connected, emit],
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSocket must be used within a <SocketProvider>.');
  }
  return ctx;
}
