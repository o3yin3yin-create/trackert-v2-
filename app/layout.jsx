import { ClerkProvider } from '@/components/AuthBridge'
import { clerkAppearance } from '@/lib/clerkTheme'
import PwaRegister from '@/components/PwaRegister'
import './globals.css'

export const metadata = {
  title: 'bokra',
  description: 'Habit Tracker & Focus Companion',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
}

export const viewport = {
  themeColor: '#000000',
}

export default function RootLayout({ children }) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html lang="en" className="dark" style={{ backgroundColor: '#000000', colorScheme: 'dark' }}>
        <head>
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black" />
          <meta name="apple-mobile-web-app-title" content="bokra" />
          <link rel="apple-touch-icon" href="/icon-192.png" />
          <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png" />
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#000000" />
        </head>
        <body className="bg-black text-white antialiased selection:bg-white/20">
          <PwaRegister />
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}