import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Search, FileText, FolderOpen, Calendar, ArrowLeft } from 'lucide-react'
import { CRM_STATUS_LABELS } from '@/lib/constants/statuses'
import { STATUS_COLORS } from '@/lib/constants/colors'

export default async function RecherchePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams
  const query = params.q || ''
  
  if (!query) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">🔍 Recherche</h1>
        <p className="text-gray-500">Entrez un terme de recherche dans la barre ci-dessus.</p>
      </div>
    )
  }

  const supabase = await createClient()
  const searchTerm = `%${query}%`

  // Rechercher dans les leads
  const { data: leads } = await supabase
    .from('leads')
    .select('id, first_name, last_name, phone, email, source, created_at')
    .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},phone.ilike.${searchTerm},email.ilike.${searchTerm}`)
    .limit(20)

  // Rechercher dans les dossiers
  const { data: dossiers } = await supabase
    .from('client_files')
    .select('id, file_reference, crm_status, quoted_price, primary_contact_first_name, primary_contact_last_name, events(name)')
    .or(`file_reference.ilike.${searchTerm},primary_contact_first_name.ilike.${searchTerm},primary_contact_last_name.ilike.${searchTerm}`)
    .limit(20)

  // Rechercher dans les événements
  const { data: events } = await supabase
    .from('events')
    .select('id, name, destination_label, event_type, start_date')
    .or(`name.ilike.${searchTerm},destination_label.ilike.${searchTerm}`)
    .limit(20)

  const totalResults = (leads?.length || 0) + (dossiers?.length || 0) + (events?.length || 0)

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-500 hover:text-turquoise-600 mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour au dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">
          🔍 Résultats pour &ldquo;{query}&rdquo;
        </h1>
        <p className="text-gray-600 mt-1">{totalResults} résultat(s) trouvé(s)</p>
      </div>

      <div className="space-y-8">
        {/* Leads */}
        {leads && leads.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 flex items-center">
              <FileText className="w-5 h-5 text-blue-500 mr-2" />
              <h2 className="font-semibold text-gray-900">Leads ({leads.length})</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {leads.map((lead: any) => (
                <Link key={lead.id} href={`/dashboard/leads/${lead.id}/modifier`} className="block px-6 py-3 hover:bg-gray-50">
                  <p className="font-medium text-gray-900">{lead.first_name} {lead.last_name}</p>
                  <p className="text-sm text-gray-500">{lead.phone} · {lead.email} · Source: {lead.source}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Dossiers */}
        {dossiers && dossiers.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 flex items-center">
              <FolderOpen className="w-5 h-5 text-turquoise-500 mr-2" />
              <h2 className="font-semibold text-gray-900">Dossiers ({dossiers.length})</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {dossiers.map((d: any) => (
                <Link key={d.id} href={`/dashboard/dossiers/${d.id}`} className="block px-6 py-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-turquoise-600">{d.file_reference}</p>
                      <p className="text-sm text-gray-900">
                        {d.primary_contact_first_name
                          ? `${d.primary_contact_first_name} ${d.primary_contact_last_name || ''}`
                          : '—'}
                      </p>
                      <p className="text-xs text-gray-500">{d.events?.name || '—'}</p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${STATUS_COLORS[d.crm_status] || 'bg-gray-100 text-gray-700'}`}>
                      {CRM_STATUS_LABELS[d.crm_status] || d.crm_status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Événements */}
        {events && events.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 flex items-center">
              <Calendar className="w-5 h-5 text-green-500 mr-2" />
              <h2 className="font-semibold text-gray-900">Événements ({events.length})</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {events.map((event: any) => (
                <Link key={event.id} href={`/dashboard/evenements/${event.id}`} className="block px-6 py-3 hover:bg-gray-50">
                  <p className="font-medium text-gray-900">{event.name}</p>
                  <p className="text-sm text-gray-500">
                    📍 {event.destination_label}
                    {event.start_date && ` · ${new Date(event.start_date).toLocaleDateString('fr-FR')}`}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {totalResults === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Aucun résultat trouvé pour &ldquo;{query}&rdquo;</p>
            <p className="text-gray-400 text-sm mt-2">Essayez avec un autre terme de recherche</p>
          </div>
        )}
      </div>
    </div>
  )
}
