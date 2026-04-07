import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Calendar } from 'lucide-react'

export default async function ActivitesPage() {
  const supabase = await createClient()

  const { data: activites } = await supabase
    .from('activites')
    .select(`
      *,
      clients (nom)
    `)
    .order('date_debut', { ascending: false })
    .limit(200)

  const typeIcons: Record<string, string> = {
    appel: '📞',
    email: '✉️',
    reunion: '🤝',
    tache: '✅',
    note: '📝',
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Activités</h1>
          <p className="text-gray-600 mt-1">Suivez vos activités et rendez-vous</p>
        </div>
        <Link
          href="/dashboard/activites/nouveau"
          className="flex items-center px-4 py-2 bg-turquoise-600 text-white rounded-lg hover:bg-turquoise-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nouvelle activité
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow">
        {activites && activites.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activité</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priorité</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activites.map((act: any) => (
                  <tr key={act.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-xl">
                          {typeIcons[act.type_activite] || '📅'}
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">{act.sujet}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {act.clients?.nom || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                      {act.type_activite}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(act.date_debut).toLocaleDateString('fr-FR', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        act.statut === 'termine' ? 'bg-green-100 text-green-800' :
                        act.statut === 'en_cours' ? 'bg-blue-100 text-blue-800' :
                        act.statut === 'annule' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {act.statut.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        act.priorite === 'urgente' ? 'bg-red-100 text-red-800' :
                        act.priorite === 'haute' ? 'bg-orange-100 text-orange-800' :
                        act.priorite === 'normale' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {act.priorite}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune activité pour le moment</h3>
            <p className="text-gray-600 mb-6">Commencez par créer votre première activité</p>
            <Link
              href="/dashboard/activites/nouveau"
              className="inline-flex items-center px-4 py-2 bg-turquoise-600 text-white rounded-lg hover:bg-turquoise-700 transition-colors"
            >
              Créer une activité
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
