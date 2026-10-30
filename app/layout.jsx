import { ClerkProvider } from '@/components/AuthBridge'
import { clerkAppearance, clerkLocalization } from '@/lib/clerkTheme'
import PwaRegister from '@/components/PwaRegister'
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata = {
  metadataBase: new URL('https://bokra101.vercel.app'),
  title: {
    default: 'bokra - Habit Tracker & Focus Companion',
    template: '%s | bokra',
  },
  description: 'Habit Tracker & Ambient Focus Companion with live flight tracking and offline-first habit streaks.',
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://bokra101.vercel.app',
    siteName: 'bokra',
    title: 'bokra - Habit Tracker & Focus Companion',
    description: 'Master your daily habits, Pomodoro sessions, and flight focus in an Apple-grade dark dashboard.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'bokra - Habit Tracker & Ambient Focus Companion',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'bokra - Habit Tracker & Focus Companion',
    description: 'Master your daily habits, Pomodoro sessions, and flight focus in an Apple-grade dark dashboard.',
    images: ['/og-image.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'bokra',
  },
  icons: {
    icon: '/icon-192.png',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }) {
  return (
    <ClerkProvider 
      appearance={clerkAppearance}
      localization={clerkLocalization}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      signInForceRedirectUrl="/"
      signUpForceRedirectUrl="/"
    >
      <html 
        lang="en" 
        className={`dark ${spaceGrotesk.variable} ${jetbrainsMono.variable}`} 
        style={{ backgroundColor: '#000000', colorScheme: 'dark' }}
      >
        <head>
          <meta name="HandheldFriendly" content="true" />
          <meta name="MobileOptimized" content="width" />
          <meta name="format-detection" content="telephone=no" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="bokra" />
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#000000" />
        </head>
        <body className={`${spaceGrotesk.className} font-sans bg-black text-white antialiased selection:bg-white/20`}>
          <PwaRegister />
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}