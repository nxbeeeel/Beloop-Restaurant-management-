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
    'dns-prefetch': 'https://clerk.belooprms.app',
    'preconnect': 'https://clerk.belooprms.app',
  }
}

// Clerk Appearance Configuration
const clerkAppearance = {
  variables: {
    colorPrimary: '#e11d48', // Rose-600
    colorTextOnPrimaryBackground: '#ffffff',
    colorBackground: '#fafafa',
    colorInputBackground: '#ffffff',
    colorInputText: '#0a0a0a',
    colorText: '#0a0a0a',
    colorTextSecondary: '#737373',
    borderRadius: '0.75rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  elements: {
    formButtonPrimary: 'bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-500/20',
    card: 'shadow-xl border border-stone-200',
    headerTitle: 'text-stone-900 font-bold',
    headerSubtitle: 'text-stone-500',
    socialButtonsBlockButton: 'border-stone-300 hover:bg-stone-50',
    formFieldInput: 'border-stone-300 focus:border-rose-500 focus:ring-rose-500',
    footerActionLink: 'text-rose-600 hover:text-rose-700',
    identityPreview: 'border-stone-200',
    formFieldLabel: 'text-stone-700',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider afterSignOutUrl="/" appearance={clerkAppearance}>
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

