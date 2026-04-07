import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FolderOpen, Search, Download } from 'lucide-react'
import { CRM_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/constants/statuses'
import { STATUS_COLORS } from '@/lib/constants/colors'

export default async function DossiersPage() {
  const supabase = await createClient()

  const { data: dossiers, error } = await supabase
    .from('client_files')
    .select(`
      *,
      events (name, destination_label, start_date),
      leads (first_name, last_name, phone, email)
    `)
    .order('updated_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('Error fetching dossiers:', error)
  }

  // Stats
  const total = dossiers?.length || 0
  const enCours = dossiers?.filter(d => ['lead', 'inscription_en_cours', 'bulletin_pret'].includes(d.crm_status)).length || 0
  const valides = dossiers?.filter(d => d.crm_status === 'valide' || d.crm_status === 'paye').length || 0
  const caTotal = dossiers?.reduce((sum, d) => sum + (d.quoted_price || 0), 0) || 0

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📁 Dossiers</h1>
          <p className="text-gray-600 mt-1">Tous les dossiers clients</p>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-600">Total dossiers</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-600">En cours</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{enCours}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-600">Validés / Payés</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{valides}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-600">CA total</p>
          <p className="text-2xl font-bold text-turquoise-600 mt-1">
            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(caTotal)}
          </p>
        </div>
      </div>

      {/* Table des dossiers */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {dossiers && dossiers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Référence</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Événement</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut CRM</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paiement</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mis à jour</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dossiers.map((dossier: any) => (
                  <tr key={dossier.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/dashboard/dossiers/${dossier.id}`}
                        className="text-turquoise-600 hover:text-turquoise-800 font-medium"
                      >
                        {dossier.file_reference}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">
                          {dossier.primary_contact_first_name
                            ? `${dossier.primary_contact_first_name} ${dossier.primary_contact_last_name || ''}`
                            : dossier.leads
                            ? `${dossier.leads.first_name} ${dossier.leads.last_name}`
                            : '—'}
                        </p>
                        {(dossier.primary_contact_phone || dossier.leads?.phone) && (
                          <p className="text-gray-500 text-xs">{dossier.primary_contact_phone || dossier.leads?.phone}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {dossier.events?.name || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${STATUS_COLORS[dossier.crm_status] || 'bg-gray-100 text-gray-700'}`}>
                        {CRM_STATUS_LABELS[dossier.crm_status] || dossier.crm_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${STATUS_COLORS[dossier.payment_status] || 'bg-gray-100 text-gray-700'}`}>
                        {PAYMENT_STATUS_LABELS[dossier.payment_status] || dossier.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {dossier.quoted_price
                        ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(dossier.quoted_price)
                        : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(dossier.updated_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">Aucun dossier</p>
            <p className="text-gray-400 text-sm">Les dossiers sont créés en convertissant des leads</p>
          </div>
        )}
      </div>
    </div>
  )
}
