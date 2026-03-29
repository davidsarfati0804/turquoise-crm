import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FileText, Users, CheckCircle, Clock, DollarSign, TrendingUp, Calendar } from 'lucide-react'
import { CRM_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/constants/statuses'

export default async function DashboardPage() {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]

  // 3 requêtes au lieu de 8 — KPIs calculés côté JS
  const [{ count: leadsToday }, { data: allFiles }, { data: events }] = await Promise.all([
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today),
    supabase
      .from('client_files')
      .select('id, file_reference, crm_status, payment_status, quoted_price, updated_at, primary_contact_first_name, primary_contact_last_name, event_id, events(name)')
      .order('updated_at', { ascending: false }),
    supabase
      .from('events')
      .select('id, name, destination_label, client_files(count)')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  // KPIs calculés en JS depuis allFiles
  const inscriptionsEnCours = allFiles?.filter(d => ['lead', 'inscription_en_cours', 'bulletin_pret'].includes(d.crm_status)).length ?? 0
  const validates = allFiles?.filter(d => d.crm_status === 'valide').length ?? 0
  const paiementsEnAttente = allFiles?.filter(d => d.payment_status === 'pending').length ?? 0
  const payes = allFiles?.filter(d => d.payment_status === 'paid').length ?? 0
  const caEstime = allFiles?.filter(d => ['valide', 'paiement_en_attente', 'paye'].includes(d.crm_status)).reduce((sum, d) => sum + (d.quoted_price || 0), 0) ?? 0
  const recentFiles = allFiles?.slice(0, 10) ?? []

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Vue d'ensemble de votre activité</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <Link href="/dashboard/leads" className="block">
          <div className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">{leadsToday || 0}</span>
            </div>
            <p className="text-xs font-medium text-gray-600">Leads du jour</p>
          </div>
        </Link>

        <Link href="/dashboard/crm?status=in_progress" className="block">
          <div className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <span className="text-2xl font-bold text-gray-900">{inscriptionsEnCours || 0}</span>
            </div>
            <p className="text-xs font-medium text-gray-600">Inscriptions en cours</p>
          </div>
        </Link>

        <Link href="/dashboard/crm?status=validated" className="block">
          <div className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-2xl font-bold text-gray-900">{validates || 0}</span>
            </div>
            <p className="text-xs font-medium text-gray-600">Validés</p>
          </div>
        </Link>

        <Link href="/dashboard/paiements?status=pending" className="block">
          <div className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-yellow-600" />
              <span className="text-2xl font-bold text-gray-900">{paiementsEnAttente || 0}</span>
            </div>
            <p className="text-xs font-medium text-gray-600">Paiements en attente</p>
          </div>
        </Link>

        <Link href="/dashboard/paiements?status=paid" className="block">
          <div className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-5 h-5 text-turquoise-600" />
              <span className="text-2xl font-bold text-gray-900">{payes || 0}</span>
            </div>
            <p className="text-xs font-medium text-gray-600">Payés</p>
          </div>
        </Link>

        <div className="bg-gradient-to-br from-turquoise-500 to-turquoise-600 rounded-lg shadow p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5" />
            <span className="text-2xl font-bold">{new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(caEstime)}€</span>
          </div>
          <p className="text-xs font-medium">CA estimé</p>
        </div>
      </div>

      {/* Vue par événement */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">📅 Événements récents</h2>
            <Link href="/dashboard/evenements" className="text-turquoise-600 hover:text-turquoise-700 text-sm font-medium">
              Voir tout →
            </Link>
          </div>
        </div>
        <div className="p-6">
          {events && events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((event: any) => (
                <Link key={event.id} href={`/dashboard/evenements/${event.id}`}>
                  <div className="border border-gray-200 rounded-lg p-4 hover:border-turquoise-500 hover:shadow-md transition-all">
                    <h3 className="font-semibold text-gray-900 mb-2">{event.name}</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>📍 {event.destination_label}</p>
                      <p className="font-medium text-turquoise-600">{event.client_files?.[0]?.count || 0} dossier(s)</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Aucun événement créé</p>
          )}
        </div>
      </div>

      {/* Derniers dossiers modifiés */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">🔄 Derniers dossiers modifiés</h2>
        </div>
        <div className="overflow-x-auto">
          {recentFiles && recentFiles.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Référence</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Événement</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut CRM</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paiement</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modifié</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentFiles.map((file: any) => (
                  <tr key={file.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/dashboard/dossiers/${file.id}`} className="text-turquoise-600 hover:text-turquoise-800 font-medium">
                        {file.file_reference}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {file.primary_contact_first_name
                        ? `${file.primary_contact_first_name} ${file.primary_contact_last_name || ''}`
                        : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {file.events?.name || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        file.crm_status === 'valide' || file.crm_status === 'paye' ? 'bg-green-100 text-green-800' :
                        file.crm_status === 'inscription_en_cours' ? 'bg-blue-100 text-blue-800' :
                        file.crm_status === 'bulletin_pret' ? 'bg-purple-100 text-purple-800' :
                        file.crm_status === 'annule' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {CRM_STATUS_LABELS[file.crm_status] || file.crm_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        file.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                        file.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {PAYMENT_STATUS_LABELS[file.payment_status] || file.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(file.updated_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500 text-center py-12">Aucun dossier pour le moment</p>
          )}
        </div>
      </div>
    </div>
  )
}
