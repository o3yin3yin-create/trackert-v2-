export const metadata = {
  title: 'Live Interactive Preview | bokra',
  description: 'Experience bokra interactive habit dashboard, flight focus tracker, and audio companion in full preview mode.',
  alternates: {
    canonical: '/preview',
  },
  openGraph: {
    title: 'Interactive Dashboard Preview | bokra',
    description: 'Explore habits, streaks, focus modes, and boarding passes in the live interactive demo.',
    url: 'https://bokra101.vercel.app/preview',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'bokra Preview' }],
  },
};

export default function PreviewLayout({ children }) {
  return children;
}
