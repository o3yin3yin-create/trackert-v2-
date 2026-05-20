import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata = {
  title: '6afra Tracker',
  description: 'Premium Habit Tracker',
  manifest: '/manifest.json',
}

export const viewport = {
  themeColor: '#000000',
}

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="bg-black text-white antialiased selection:bg-white/20">
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}