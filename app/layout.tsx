import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { CartProvider } from '@/src/contexts/CartContext'
import BottomNavigation from '@/src/components/BottomNavigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Next.js Supabase App',
  description: 'Next.js App Router with Supabase',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <CartProvider>
          <div className="pb-16 sm:pb-0">
            {children}
          </div>
          <BottomNavigation />
        </CartProvider>
      </body>
    </html>
  )
}

