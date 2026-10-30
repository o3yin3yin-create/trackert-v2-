import Link from 'next/link';

export const metadata = {
  title: '404 - Page Not Found | bokra',
  description: 'The requested page could not be found.',
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 py-12 selection:bg-white/20 font-sans antialiased text-center">
      <div className="max-w-md w-full flex flex-col items-center">
        <span className="font-mono text-sm tracking-widest uppercase text-white/50 mb-2">Error 404</span>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4">
          Page Not Found
        </h1>
        <p className="text-base text-white/70 max-w-sm mb-8 leading-relaxed">
          The page or resource you are looking for does not exist, has been removed, or is temporarily unavailable.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
          <Link
            href="/"
            className="w-full h-11 flex items-center justify-center rounded-xl bg-white text-black font-semibold text-sm hover:bg-neutral-200 active:scale-95 transition-all shadow-md"
          >
            Return to Dashboard
          </Link>
          <Link
            href="/download"
            className="w-full h-11 flex items-center justify-center rounded-xl border border-white/20 bg-white/5 text-white font-medium text-sm hover:bg-white/10 active:scale-95 transition-all"
          >
            Download Apps
          </Link>
        </div>
      </div>
    </div>
  );
}
