/**
 * Central API Client for bokra
 * Handles unified base URL routing (Local vs Vercel Hosted) & Network Error Handling
 */

export const isTauriEnvironment = () => {
  if (typeof window === 'undefined') return false;
  return !!(
    window.__TAURI_INTERNALS__ !== undefined || 
    window.__TAURI__ !== undefined ||
    (typeof window.isTauri === 'function' ? window.isTauri() : window.isTauri === true) ||
    window.location.protocol === 'tauri:' || 
    window.location.protocol === 'asset:' ||
    window.location.hostname === 'tauri.localhost' ||
    window.location.protocol === 'file:' ||
    process.env.NEXT_PUBLIC_IS_DESKTOP === 'true'
  );
};

export const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    if (isTauriEnvironment()) {
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

  const isTauri = isTauriEnvironment();

  // Retrieve token: 1) local desktop auth token, 2) active token getter from Clerk hook, 3) cached token, 4) Clerk session token
  let token = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('bokra_desktop_token') || null;
    if (!token && tokenGetter) {
      try {
        token = await Promise.race([
          tokenGetter(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
        ]);
        if (token) localStorage.setItem('bokra_cached_clerk_token', token);
      } catch (e) {
        // Ignored if offline or timed out
      }
    }
    if (!token) {
      token = localStorage.getItem('bokra_cached_clerk_token') || null;
    }
    if (!token && window.Clerk?.session) {
      try {
        token = await Promise.race([
          window.Clerk.session.getToken(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
        ]);
        if (token) localStorage.setItem('bokra_cached_clerk_token', token);
      } catch (e) {
        // Ignored if offline or timed out
      }
    }
  }

  const headers = {
    'Accept': 'application/json',
    ...(options.body && typeof options.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // Keepalive pagehide requests must not attach AbortSignal: browsers abort
  // them on unload, and keepalive bodies are already size-limited.
  const isKeepalive = Boolean(options.keepalive);
  const controller = isKeepalive ? null : new AbortController();
  const timeoutMs = options.timeoutMs || 10000;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  if (controller && options.signal) {
    options.signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const res = await fetch(url, {
      credentials: isTauri ? 'omit' : 'include',
      mode: 'cors',
      ...options,
      headers,
      ...(controller ? { signal: controller.signal } : {}),
    });
    // Do NOT wipe desktop token on transient 401s; only explicit logout or auth failure should clear it
    return res;
  } catch (err) {
    console.warn('[bokra API Network Error]', endpoint, err);
    throw err;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
