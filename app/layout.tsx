import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { TRPCProvider } from "@/components/ui/TRPCProvider";
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Beloop',
  description: 'Multi-tenant SaaS expense tracking system for restaurant chains',
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' }
    ],
    apple: '/logo.png',
  },
  other: {
    // Performance optimization: Prefetch Clerk resources
    'dns-prefetch': 'https://clerk.belooprms.app',
    'preconnect': 'https://clerk.belooprms.app',
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider afterSignOutUrl="/">
      <html lang="en">
        <body className="antialiased">
          <TRPCProvider>
            {children}
            <Toaster position="top-right" richColors />
          </TRPCProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
