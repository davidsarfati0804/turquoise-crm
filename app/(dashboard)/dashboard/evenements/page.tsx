import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Calendar, MapPin, Users, DollarSign, Plus, Edit } from 'lucide-react'
import { EVENT_STATUS_LABELS } from '@/lib/constants/statuses'
import { STATUS_COLORS } from '@/lib/constants/colors'

export default async function EvenementsPage() {
  const supabase = await createClient()

  const { data: events, error } = await supabase
    .from('events')
    .select(`
      *,
      client_files (
        id,
        quoted_price
      )
    `)
    .order('start_date', { ascending: false })

  if (error) {
    console.error('Error fetching events:', error)
  }

  // Calculer les stats par événement
  const eventsWithStats = events?.map(event => {
    const nbDossiers = event.client_files?.length || 0
    const caEstime = event.client_files?.reduce((sum: number, file: any) => sum + (file.quoted_price || 0), 0) || 0
    return {
      ...event,
      nbDossiers,
      caEstime
    }
  }) || []

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📅 Événements</h1>
          <p className="text-gray-600 mt-1">Gérez vos voyages organisés</p>
        </div>
        <Link 
          href="/dashboard/evenements/nouveau"
          className="inline-flex items-center px-4 py-2 bg-turquoise-600 hover:bg-turquoise-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nouvel événement
        </Link>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-600">Total événements</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{eventsWithStats.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-600">Total dossiers</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {eventsWithStats.reduce((sum, e) => sum + e.nbDossiers, 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-600">CA total estimé</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(
              eventsWithStats.reduce((sum, e) => sum + e.caEstime, 0)
            )}€
          </p>
        </div>
      </div>

      {/* Liste des événements */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {eventsWithStats.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Destination
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dates
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dossiers
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CA estimé
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {eventsWithStats.map((event) => {
                return (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link 
                        href={`/dashboard/evenements/${event.id}`}
                        className="font-medium text-turquoise-600 hover:text-turquoise-800"
                      >
                        {event.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {event.event_type === 'sejour' ? '🏖️ Séjour' : 
                       event.event_type === 'mariage' ? '💒 Mariage' : '🌴 Autre'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {event.destination_label}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {event.start_date
                        ? new Date(event.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
                        : '—'}
                      {event.end_date
                        ? ` → ${new Date(event.end_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}`
                        : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${STATUS_COLORS[event.status] || 'bg-gray-100 text-gray-700'}`}>
                        {EVENT_STATUS_LABELS[event.status] || event.status || 'Actif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center text-gray-900">
                        <Users className="w-4 h-4 mr-1 text-gray-400" />
                        {event.nbDossiers}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 mr-1 text-green-600" />
                        {new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(event.caEstime)}€
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-3">
                        <Link
                          href={`/dashboard/evenements/${event.id}/modifier`}
                          className="text-gray-400 hover:text-turquoise-600 transition-colors"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <Link 
                          href={`/dashboard/evenements/${event.id}`}
                          className="text-turquoise-600 hover:text-turquoise-900"
                        >
                          Voir détails →
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">Aucun événement</p>
            <p className="text-gray-400 text-sm mb-6">Commencez par créer votre premier événement</p>
            <Link 
              href="/dashboard/evenements/nouveau"
              className="inline-flex items-center px-4 py-2 bg-turquoise-600 hover:bg-turquoise-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Créer un événement
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
