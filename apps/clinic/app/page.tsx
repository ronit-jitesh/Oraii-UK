import { redirect } from 'next/navigation'

// Simple redirect — Supabase auth is handled by each dashboard page server component
// The middleware handles session timeout; if not authenticated, dashboard pages redirect to login
export default function Home() {
  redirect('/dashboard')
}
