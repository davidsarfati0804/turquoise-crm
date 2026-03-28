import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Briefcase } from 'lucide-react'

export default async function OpportunitesPage() {
  const supabase = await createClient()

  const { data: opportunites } = await supabase
    .from('opportunites')
    .select(`
      *,
      clients (nom)
    `)
    .order('date_creation', { ascending: false })

  const etapeColors: Record<string, string> = {
    prospection: 'bg-gray-100 text-gray-800',
    qualification: 'bg-blue-100 text-blue-800',
    proposition: 'bg-yellow-100 text-yellow-800',
    negociation: 'bg-orange-100 text-orange-800',
    gagnee: 'bg-green-100 text-green-800',
    perdue: 'bg-red-100 text-red-800',
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Opportunités</h1>
          <p className="text-gray-600 mt-1">Suivez vos opportunités commerciales</p>
        </div>
        <Link
          href="/dashboard/opportunites/nouveau"
          className="flex items-center px-4 py-2 bg-turquoise-600 text-white rounded-lg hover:bg-turquoise-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nouvelle opportunité
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow">
        {opportunites && opportunites.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opportunité</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Étape</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Probabilité</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clôture estimée</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {opportunites.map((opp: any) => (
                  <tr key={opp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Briefcase className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">{opp.titre}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {opp.clients?.nom || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {opp.montant ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: opp.devise || 'EUR' }).format(opp.montant) : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${etapeColors[opp.etape] || 'bg-gray-100 text-gray-800'}`}>
                        {opp.etape}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {opp.probabilite !== null ? `${opp.probabilite}%` : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {opp.date_cloture_estimee ? new Date(opp.date_cloture_estimee).toLocaleDateString('fr-FR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune opportunité pour le moment</h3>
            <p className="text-gray-600 mb-6">Commencez par créer votre première opportunité</p>
            <Link
              href="/dashboard/opportunites/nouveau"
              className="inline-flex items-center px-4 py-2 bg-turquoise-600 text-white rounded-lg hover:bg-turquoise-700 transition-colors"
            >
              Créer une opportunité
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
