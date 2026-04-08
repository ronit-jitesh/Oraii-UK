import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ORAII Clinical | Therapist Portal',
  description: 'AI-assisted clinical documentation for UK therapists',
  robots: 'noindex, nofollow',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en-GB">
      <body className="bg-[#F7F5F0] text-gray-900 antialiased">{children}</body>
    </html>
  )
}
