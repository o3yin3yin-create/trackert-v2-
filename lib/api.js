/**
 * Central API Client for bokra
 * Handles unified base URL routing (Local vs Vercel Hosted) & Network Error Handling
 */

export const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Check if running inside desktop (Tauri, file://, custom scheme) or export
    const isTauri = typeof window !== 'undefined' && (
      window.__TAURI_INTERNALS__ !== undefined || 
      window.__TAURI__ !== undefined ||
      window.location.protocol === 'tauri:' || 
      window.location.protocol === 'asset:' ||
      window.location.hostname === 'tauri.localhost' ||
      window.location.protocol === 'file:'
    );

    if (isTauri || process.env.NEXT_PUBLIC_IS_DESKTOP === 'true') {
      return process.env.NEXT_PUBLIC_API_URL || 'https://bokra101.vercel.app';
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || '';
};

let tokenGetter = null;

export function setApiTokenGetter(getter) {
  tokenGetter = getter;
}

export async function apiFetch(endpoint, options = {}) {
  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

  // Retrieve token: 1) local desktop auth token, 2) active token getter from Clerk hook, 3) cached token, 4) Clerk session token
  let token = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('bokra_desktop_token') || null;
    if (!token && tokenGetter) {
      try {
        token = await tokenGetter();
        if (token) localStorage.setItem('bokra_cached_clerk_token', token);
      } catch (e) {
        // Ignored if offline
      }
    }
    if (!token) {
      token = localStorage.getItem('bokra_cached_clerk_token') || null;
    }
    if (!token && window.Clerk?.session) {
      try {
        token = await window.Clerk.session.getToken();
        if (token) localStorage.setItem('bokra_cached_clerk_token', token);
      } catch (e) {
        // Ignored if offline
      }
    }
  }

  const headers = {
    'Accept': 'application/json',
    ...(options.body && typeof options.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const res = await fetch(url, {
      credentials: 'include',
      mode: 'cors',
      ...options,
      headers,
    });
    return res;
  } catch (err) {
    console.warn(`[bokra API Network Error] ${endpoint}:`, err);
    throw err;
  }
}
