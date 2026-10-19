import { ClerkProvider } from '@/components/AuthBridge'
import { dark } from '@clerk/themes'
import './globals.css'

export const metadata = {
  title: 'bokra',
  description: 'Habit Tracker & Focus Companion',
  manifest: '/manifest.json',
}

export const viewport = {
  themeColor: '#000000',
}

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#FFFFFF',
          colorBackground: '#121214',
          colorInputBackground: '#1C1C1E',
          colorInputText: '#FFFFFF',
          colorText: '#FFFFFF',
          colorTextSecondary: 'rgba(255, 255, 255, 0.65)',
          borderRadius: '14px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
        },
        layout: {
          socialButtonsPlacement: 'top',
          showOptionalFields: false,
          logoImageUrl: '/logo-transparent.png',
        },
      }}
    >
      <html lang="en">
        <head>
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="theme-color" content="#000000" />
        </head>
        <body className="bg-black text-white antialiased selection:bg-white/20">
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}