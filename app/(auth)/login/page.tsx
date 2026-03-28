import { Metadata } from 'next'
import LoginForm from './LoginForm'

export const metadata: Metadata = {
  title: 'Connexion | Turquoise CRM',
}

export default function LoginPage() {
  return (
    <div className="bg-white shadow-2xl rounded-2xl p-8 max-w-md w-full">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🏝️ Turquoise CRM
        </h1>
        <p className="text-gray-600">
          Votre CRM métier pour agence de voyage premium
        </p>
      </div>

      <LoginForm />

      <div className="mt-8 text-center text-xs text-gray-500">
        © 2026 Club Turquoise • Tous droits réservés
      </div>
    </div>
  )
}
