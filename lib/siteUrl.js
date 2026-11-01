export function siteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
  const url = String(raw || 'https://bokra101.vercel.app').replace(/\/+$/, '');
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
}
