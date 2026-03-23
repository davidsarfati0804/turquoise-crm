import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Connexion | Turquoise CRM',
}

export default function LoginPage() {
  return (
    <div className="bg-white shadow-2xl rounded-2xl p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🏝️ Turquoise CRM
        </h1>
        <p className="text-gray-600">
          Votre CRM métier pour agence de voyage premium
        </p>
      </div>

      <div className="space-y-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-4">
            ✅ Infrastructure prête !
          </h2>
          <p className="text-gray-600 mb-4">
            Suivez le guide <code className="bg-gray-100 px-2 py-1 rounded">SETUP_GUIDE.md</code>
          </p>
          <p className="text-sm text-gray-500">
            4 étapes rapides • 5 minutes
          </p>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold mb-3">Prochaines étapes :</h3>
          <ol className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <span className="mr-2">1.</span>
              <span>Créer un compte Supabase</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">2.</span>
              <span>Copier les clés API dans <code>.env.local</code></span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">3.</span>
              <span>Exécuter les migrations SQL</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">4.</span>
              <span>Créer un utilisateur admin</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">5.</span>
              <span>Lancer <code>npm install && npm run dev</code></span>
            </li>
          </ol>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-gray-500">
        © 2026 Club Turquoise • Tous droits réservés
      </div>
    </div>
  )
}
