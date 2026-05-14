import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------
export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// ---------------------------------------------------------------------------
// Request interceptor — attach Bearer token from localStorage
// ---------------------------------------------------------------------------
api.interceptors.request.use(
  (config) => {
    // localStorage is only available on the client side
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('gt_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ---------------------------------------------------------------------------
// Response interceptor — handle 401 Unauthorized
// ---------------------------------------------------------------------------
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      typeof window !== 'undefined' &&
      error.response &&
      error.response.status === 401
    ) {
      localStorage.removeItem('gt_token');
      localStorage.removeItem('gt_user');

      // Avoid redirect loops if already on /login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// ---------------------------------------------------------------------------
// Auth token helpers
// ---------------------------------------------------------------------------

/**
 * Attach a token to every subsequent request.
 * Also persists the token in localStorage.
 */
export function setAuthToken(token) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('gt_token', token);
  }
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
}

/**
 * Remove the Authorization header and clear localStorage.
 */
export function clearAuthToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('gt_token');
    localStorage.removeItem('gt_user');
  }
  delete api.defaults.headers.common.Authorization;
}

// ---------------------------------------------------------------------------
// Convenience wrappers
// ---------------------------------------------------------------------------

/**
 * @param {string} url
 * @param {import('axios').AxiosRequestConfig} [config]
 */
export function get(url, config) {
  return api.get(url, config);
}

/**
 * @param {string} url
 * @param {unknown} [data]
 * @param {import('axios').AxiosRequestConfig} [config]
 */
export function post(url, data, config) {
  return api.post(url, data, config);
}

/**
 * @param {string} url
 * @param {unknown} [data]
 * @param {import('axios').AxiosRequestConfig} [config]
 */
export function put(url, data, config) {
  return api.put(url, data, config);
}

/**
 * @param {string} url
 * @param {unknown} [data]
 * @param {import('axios').AxiosRequestConfig} [config]
 */
export function patch(url, data, config) {
  return api.patch(url, data, config);
}

/**
 * Named `del` because `delete` is a reserved keyword in JS.
 * @param {string} url
 * @param {import('axios').AxiosRequestConfig} [config]
 */
export function del(url, config) {
  return api.delete(url, config);
}
