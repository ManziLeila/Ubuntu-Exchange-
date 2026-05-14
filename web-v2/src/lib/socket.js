import { io } from 'socket.io-client';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3001';

// ---------------------------------------------------------------------------
// Module-level singleton — one socket connection for the entire app lifetime
// ---------------------------------------------------------------------------
/** @type {import('socket.io-client').Socket | null} */
let socketInstance = null;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the shared Socket.io instance, creating it on the first call.
 * Safe to call multiple times — always returns the same socket.
 *
 * @returns {import('socket.io-client').Socket}
 */
export function getSocket() {
  // Guard: socket.io-client uses browser APIs; bail out during SSR
  if (typeof window === 'undefined') {
    throw new Error('getSocket() must only be called on the client side.');
  }

  if (!socketInstance) {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('gt_token')
        : null;

    socketInstance = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      // Reconnect automatically up to 5 times, then stop
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      // Don't auto-connect; the caller decides when to connect
      autoConnect: true,
    });

    // Development-only logging
    if (process.env.NODE_ENV === 'development') {
      socketInstance.on('connect', () => {
        console.log('[Socket] Connected — id:', socketInstance.id);
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected —', reason);
      });

      socketInstance.on('connect_error', (err) => {
        console.error('[Socket] Connection error —', err.message);
      });
    }
  }

  return socketInstance;
}

/**
 * Gracefully disconnects the singleton socket and nullifies the reference so
 * the next call to `getSocket()` will create a fresh connection.
 */
export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;

    if (process.env.NODE_ENV === 'development') {
      console.log('[Socket] Instance destroyed.');
    }
  }
}
