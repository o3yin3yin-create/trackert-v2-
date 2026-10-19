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
      return process.env.NEXT_PUBLIC_API_URL || 'https://trackert-v2.vercel.app';
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || '';
};

export async function apiFetch(endpoint, options = {}) {
  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...(options.body && typeof options.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
    return res;
  } catch (err) {
    console.warn(`[bokra API Network Error] ${endpoint}:`, err);
    throw err;
  }
}
