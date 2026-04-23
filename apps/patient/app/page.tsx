import { redirect } from 'next/navigation'

export default function Home() {
  // Middleware handles auth check — if user reaches here, they're authenticated
  redirect('/home')
}
