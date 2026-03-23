import { redirect } from 'next/navigation'

export default function HomePage() {
  // Rediriger vers le dashboard ou login selon l'auth
  redirect('/login')
}
