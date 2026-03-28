import { Package } from 'lucide-react'

export default function ProduitsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Produits</h1>
        <p className="text-gray-600 mt-1">Gérez votre catalogue de produits et services</p>
      </div>

      <div className="bg-white rounded-lg shadow p-12 text-center">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Module en cours de développement
        </h3>
        <p className="text-gray-600">
          La gestion des produits sera bientôt disponible
        </p>
      </div>
    </div>
  )
}
