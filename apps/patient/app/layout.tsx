import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ORAII — Your wellness companion',
  description: 'Between-session mental health support',
  manifest: '/manifest.json',
  themeColor: '#2D6A4F',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="bg-[#F7F5F0] antialiased">{children}</body>
    </html>
  )
}
