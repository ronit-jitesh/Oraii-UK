import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Next.js inline scripts + Google Fonts
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              // Supabase, OpenAI, Groq, Google Fonts
              "connect-src 'self' https://*.supabase.co https://api.openai.com https://api.groq.com https://api.eu.deepgram.com",
              // Google Fonts + self
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              // Images: self + data URIs for inline assets
              "img-src 'self' data: blob:",
              // Media (audio) from self
              "media-src 'self' blob:",
              // No framing
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
  env: { PORTAL_TYPE: 'patient' },
}

export default nextConfig
