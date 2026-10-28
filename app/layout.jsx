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
  title: 'bokra',
  description: 'Habit Tracker & Focus Companion',
  manifest: '/manifest.json',
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
  maximumScale: 1,
  userScalable: false,
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
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
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