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
import { useRouter } from 'next/navigation';
import { api, setAuthToken, clearAuthToken } from '@/lib/api';
import {
  getToken,
  setToken,
  removeToken,
  getUser,
  setUser,
  removeUser,
} from '@/lib/auth';
import { disconnectSocket } from '@/lib/socket';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
export const AuthContext = createContext(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function AuthProvider({ children }) {
  const router = useRouter();

  const [user, setUserState] = useState(null);
  const [token, setTokenState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Prevent double-initialisation in React StrictMode
  const initialised = useRef(false);

  // -------------------------------------------------------------------------
  // Mount — restore session from localStorage, then verify with /auth/me
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    async function restoreSession() {
      const storedToken = getToken();
      const storedUser = getUser();

      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      // Optimistically set the token so request interceptor can attach it
      setAuthToken(storedToken);
      setTokenState(storedToken);
      if (storedUser) setUserState(storedUser);

      try {
        const { data } = await api.get('/api/v1/auth/me');
        const freshUser = data?.user ?? data;
        setUser(freshUser);
        setUserState(freshUser);
      } catch (err) {
        // Token is invalid or expired — clear everything
        console.warn('[AuthContext] Session verification failed:', err?.message);
        _clearSession();
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------
  const _clearSession = useCallback(() => {
    removeToken();
    removeUser();
    clearAuthToken();
    setTokenState(null);
    setUserState(null);
  }, []);

  // -------------------------------------------------------------------------
  // login(email, password)
  // -------------------------------------------------------------------------
  const login = useCallback(
    async (email, password) => {
      const { data } = await api.post('/api/v1/auth/login', {
        email,
        password,
      });

      const newToken = data.accessToken || data.token;
      const newUser = data.user;

      if (!newToken) {
        throw new Error('No token returned from login endpoint.');
      }

      // Persist
      setToken(newToken);
      setUser(newUser);
      setAuthToken(newToken);

      // Update state
      setTokenState(newToken);
      setUserState(newUser);

      return newUser;
    },
    [],
  );

  // -------------------------------------------------------------------------
  // logout()
  // -------------------------------------------------------------------------
  const logout = useCallback(() => {
    _clearSession();
    disconnectSocket();
    router.push('/login');
  }, [_clearSession, router]);

  // -------------------------------------------------------------------------
  // updateUser(data)
  // -------------------------------------------------------------------------
  const updateUser = useCallback((data) => {
    setUserState((prev) => {
      const merged = { ...prev, ...data };
      setUser(merged);
      return merged;
    });
  }, []);

  // -------------------------------------------------------------------------
  // Context value — memoised to prevent unnecessary re-renders
  // -------------------------------------------------------------------------
  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      login,
      logout,
      updateUser,
    }),
    [user, token, isLoading, login, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>.');
  }
  return ctx;
}
