export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NODE_ENV === 'production') {
    if (globalThis.__bokraCronStarted) return;
    globalThis.__bokraCronStarted = true;

    const { runCronNotifications } = await import('./lib/cronNotifications');
    setInterval(() => {
      runCronNotifications().catch((err) => {
        console.error('[Instrumentation] Cron notifications error:', err);
      });
    }, 60_000);
  }
}
