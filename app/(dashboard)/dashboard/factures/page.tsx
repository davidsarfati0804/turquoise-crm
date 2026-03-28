import { Receipt } from 'lucide-react'

export default function FacturesPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Factures</h1>
        <p className="text-gray-600 mt-1">Gérez vos factures et paiements</p>
      </div>

      <div className="bg-white rounded-lg shadow p-12 text-center">
        <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Module en cours de développement
        </h3>
        <p className="text-gray-600">
          La gestion des factures sera bientôt disponible
        </p>
      </div>
    </div>
  )
}
