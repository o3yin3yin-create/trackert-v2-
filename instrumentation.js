export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Only run keep-alive in production environment
    if (process.env.NODE_ENV === 'production' && (process.env.RENDER || process.env.PORT)) {
      const TARGET_URL = 'https://bokra.onrender.com/api/ping';
      console.log('[keep-alive] Initializing autonomous background self-pinger for', TARGET_URL);

      // Initial ping after 30 seconds of boot
      setTimeout(async () => {
        try {
          const res = await fetch(TARGET_URL, {
            headers: { 'User-Agent': 'bokra-keepalive/1.0' },
            cache: 'no-store',
          });
          console.log('[keep-alive] Initial ping status:', res.status);
        } catch (e) {
          console.warn('[keep-alive] Initial ping failed:', e.message);
        }
      }, 30000);

      // Recurring ping every 4 minutes (Render sleeps after 15 minutes of inactivity)
      // This resets Render's idle timer and keeps Neon PostgreSQL database compute warm
      setInterval(async () => {
        try {
          const res = await fetch(TARGET_URL, {
            headers: { 'User-Agent': 'bokra-keepalive/1.0' },
            cache: 'no-store',
          });
          if (!res.ok) {
            console.warn('[keep-alive] Ping returned non-OK status:', res.status);
          }
        } catch (e) {
          console.warn('[keep-alive] Background ping error:', e.message);
        }
      }, 4 * 60 * 1000);
    }
  }
}
