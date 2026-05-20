import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import './globals.css'

export const metadata = {
  title: '6afra Tracker',
  description: 'Premium Habit Tracker',
}

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="bg-black text-white antialiased selection:bg-white/20">
          
          {/* Header for Clerk Auth (Styled for 6afra Theme) */}
          <header className="flex justify-between items-center p-5 max-w-[428px] mx-auto w-full border-b border-white/5">
            <div className="font-bold tracking-widest uppercase text-xs opacity-50">
              6afra Studio
            </div>
            
            <div className="flex items-center gap-4">
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button className="text-white/70 hover:text-white font-medium text-sm transition-colors">
                    Log In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="bg-[#FF9F0A] text-black rounded-full font-bold text-sm h-9 px-5 cursor-pointer hover:opacity-80 transition-opacity">
                    Sign Up
                  </button>
                </SignUpButton>
              </Show>
              
              <Show when="signed-in">
                <UserButton appearance={{ elements: { avatarBox: "w-9 h-9" } }} />
              </Show>
            </div>
          </header>

          {/* Main App Content */}
          {children}

        </body>
      </html>
    </ClerkProvider>
  )
}