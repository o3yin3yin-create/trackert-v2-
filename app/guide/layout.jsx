export const metadata = {
  title: 'User Guide & Documentation | bokra',
  description: 'Comprehensive guide to mastering your habits, focus sessions, FlightRadar syncing, and privacy in bokra.',
  alternates: {
    canonical: '/guide',
  },
  openGraph: {
    title: 'bokra User Guide & FAQ',
    description: 'Learn how to use habits, Pomodoro timers, Flight Focus, and social accountability in bokra.',
    url: 'https://bokra101.vercel.app/guide',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'bokra Guide' }],
  },
};

export default function GuideLayout({ children }) {
  return children;
}
