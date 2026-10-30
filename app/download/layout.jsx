export const metadata = {
  title: 'Download Apps | bokra',
  description: 'Download the native bokra companion apps for macOS, Windows, Android, and Web PWA.',
  alternates: {
    canonical: '/download',
  },
  openGraph: {
    title: 'Download bokra Apps',
    description: 'Native desktop and mobile companion apps with offline caching, Pomodoro focus, and habit synchronization.',
    url: 'https://bokra101.vercel.app/download',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'bokra Apps' }],
  },
};

export default function DownloadLayout({ children }) {
  return children;
}
