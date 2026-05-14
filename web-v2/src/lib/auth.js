/**
 * auth.js — Pure client-side token & user management helpers.
 *
 * No React dependencies. Safe to import from both React components and
 * plain JS modules. Every function short-circuits on the server (SSR) where
 * localStorage is unavailable.
 */

const TOKEN_KEY = 'gt_token';
const USER_KEY = 'gt_user';

// ---------------------------------------------------------------------------
// Guard
// ---------------------------------------------------------------------------

/** Returns true when running in a browser context. */
function isClient() {
  return typeof window !== 'undefined';
}

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

/**
 * Retrieves the JWT access token from localStorage.
 * @returns {string | null}
 */
export function getToken() {
  if (!isClient()) return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Persists the JWT access token in localStorage.
 * @param {string} token
 */
export function setToken(token) {
  if (!isClient()) return;
  if (!token) {
    console.warn('[auth] setToken called with a falsy value — ignoring.');
    return;
  }
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Removes the JWT access token from localStorage.
 */
export function removeToken() {
  if (!isClient()) return;
  localStorage.removeItem(TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// User helpers
// ---------------------------------------------------------------------------

/**
 * Returns the stored user object (parsed JSON) or null if missing / malformed.
 * @returns {Record<string, unknown> | null}
 */
export function getUser() {
  if (!isClient()) return null;

  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    // Corrupt data — clean it up
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

/**
 * Serialises and persists a user object in localStorage.
 * @param {Record<string, unknown>} user
 */
export function setUser(user) {
  if (!isClient()) return;
  if (user == null) {
    console.warn('[auth] setUser called with null/undefined — use removeUser().');
    return;
  }
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Removes the stored user object from localStorage.
 */
export function removeUser() {
  if (!isClient()) return;
  localStorage.removeItem(USER_KEY);
}

// ---------------------------------------------------------------------------
// Derived helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when a token is present in localStorage.
 * Does NOT verify the token with the server.
 * @returns {boolean}
 */
export function isAuthenticated() {
  return !!getToken();
}

/**
 * Returns the role string from the stored user object, or null if absent.
 *
 * Expected roles: 'client' | 'agent' | 'admin' | 'compliance_officer' | 'super_admin'
 *
 * @returns {string | null}
 */
export function getUserRole() {
  const user = getUser();
  return user?.role ?? null;
}
