import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { LayoutGrid, Table } from 'lucide-react'
import { PipelineView } from './PipelineView'
import { CRM_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/constants/statuses'
import { STATUS_COLORS } from '@/lib/constants/colors'

export default async function CRMPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const supabase = await createClient()
  const { view: viewParam } = await searchParams
  const view = viewParam || 'pipeline'

  // Charger tous les dossiers avec relations
  const { data: clientFiles, error } = await supabase
    .from('client_files')
    .select(`
      id, file_reference, crm_status, payment_status, quoted_price, updated_at, created_at,
      primary_contact_first_name, primary_contact_last_name, primary_contact_phone,
      adults_count, children_count, babies_count,
      events (name, start_date),
      leads (first_name, last_name, phone),
      room_types (name)
    `)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching client files:', error)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📋 CRM</h1>
          <p className="text-gray-600 mt-1">Gérez vos dossiers clients</p>
        </div>
        <div className="flex items-center space-x-2">
          <Link
            href="/dashboard/crm?view=pipeline"
            className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'pipeline'
                ? 'bg-turquoise-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <LayoutGrid className="w-4 h-4 mr-2" />
            Pipeline
          </Link>
          <Link
            href="/dashboard/crm?view=table"
            className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'table'
                ? 'bg-turquoise-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Table className="w-4 h-4 mr-2" />
            Table
          </Link>
        </div>
      </div>

      {view === 'pipeline' ? (
        <PipelineView clientFiles={clientFiles || []} />
      ) : (
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Référence</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Événement</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chambre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut CRM</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paiement</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clientFiles?.map((file: any) => (
                  <tr key={file.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/dashboard/dossiers/${file.id}`}
                        className="font-medium text-turquoise-600 hover:text-turquoise-800"
                      >
                        {file.file_reference}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {file.primary_contact_first_name
                        ? `${file.primary_contact_first_name} ${file.primary_contact_last_name || ''}`
                        : file.leads
                        ? `${file.leads.first_name} ${file.leads.last_name}`
                        : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {file.events?.name || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {file.room_types?.name || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {file.quoted_price != null ? `${Number(file.quoted_price).toLocaleString('fr-FR')} €` : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${STATUS_COLORS[file.crm_status] || 'bg-gray-100 text-gray-700'}`}>
                        {CRM_STATUS_LABELS[file.crm_status] || file.crm_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${STATUS_COLORS[file.payment_status] || 'bg-gray-100 text-gray-700'}`}>
                        {PAYMENT_STATUS_LABELS[file.payment_status] || file.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Link
                        href={`/dashboard/dossiers/${file.id}`}
                        className="text-turquoise-600 hover:text-turquoise-800 font-medium"
                      >
                        Voir →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(!clientFiles || clientFiles.length === 0) && (
            <div className="text-center py-12">
              <p className="text-gray-500">Aucun dossier client pour le moment</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
