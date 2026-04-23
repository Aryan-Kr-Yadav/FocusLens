import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { ThemeProvider } from './ThemeProvider'
import './globals.css'
import './cosmic.css'

export const metadata: Metadata = {
  title: 'FocusLens — Cosmic Focus Intelligence',
  description: 'Real-time eye tracking with credits, achievements, and cosmic focus analytics',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;700;800;900&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
        </head>
        <body>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
