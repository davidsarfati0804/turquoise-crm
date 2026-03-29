import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { DollarSign, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { PAYMENT_STATUS_LABELS, CRM_STATUS_LABELS } from '@/lib/constants/statuses'
import { STATUS_COLORS } from '@/lib/constants/colors'

export default async function PaiementsPage() {
  const supabase = await createClient()

  const { data: dossiers } = await supabase
    .from('client_files')
    .select(`
      id, file_reference, crm_status, payment_status, quoted_price, amount_paid, balance_due, updated_at,
      primary_contact_first_name, primary_contact_last_name, primary_contact_phone,
      events (name),
      leads (first_name, last_name, phone)
    `)
    .order('updated_at', { ascending: false })

  const all = dossiers || []
  const pending = all.filter(d => d.payment_status === 'pending')
  const partial = all.filter(d => d.payment_status === 'partial')
  const paid = all.filter(d => d.payment_status === 'paid')

  const totalCA = all.reduce((sum, d) => sum + (d.quoted_price || 0), 0)
  const totalPaid = paid.reduce((sum, d) => sum + (d.quoted_price || 0), 0)
  const totalPending = pending.reduce((sum, d) => sum + (d.quoted_price || 0), 0)

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">💳 Paiements</h1>
        <p className="text-gray-600 mt-1">Suivi des paiements et recouvrements</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-5 h-5 text-gray-400" />
            <span className="text-2xl font-bold text-gray-900">{fmt(totalCA)}</span>
          </div>
          <p className="text-xs font-medium text-gray-600">CA total dossiers</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-2xl font-bold text-green-600">{fmt(totalPaid)}</span>
          </div>
          <p className="text-xs font-medium text-gray-600">Encaissé ({paid.length} dossiers)</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-orange-500" />
            <span className="text-2xl font-bold text-orange-600">{fmt(totalPending)}</span>
          </div>
          <p className="text-xs font-medium text-gray-600">En attente ({pending.length} dossiers)</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            <span className="text-2xl font-bold text-yellow-600">{partial.length}</span>
          </div>
          <p className="text-xs font-medium text-gray-600">Paiements partiels</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Tous les dossiers avec paiements</h2>
        </div>
        {all.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Référence</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Événement</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut CRM</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paiement</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {all.map((d: any) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/dashboard/dossiers/${d.id}`} className="text-turquoise-600 hover:text-turquoise-800 font-medium">
                        {d.file_reference}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {d.primary_contact_first_name
                        ? `${d.primary_contact_first_name} ${d.primary_contact_last_name || ''}`
                        : d.leads
                        ? `${d.leads.first_name} ${d.leads.last_name}`
                        : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {d.events?.name || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${STATUS_COLORS[d.crm_status] || 'bg-gray-100 text-gray-700'}`}>
                        {CRM_STATUS_LABELS[d.crm_status] || d.crm_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${STATUS_COLORS[d.payment_status] || 'bg-gray-100 text-gray-700'}`}>
                        {PAYMENT_STATUS_LABELS[d.payment_status] || d.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                      {d.quoted_price ? fmt(d.quoted_price) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucun dossier avec paiement</p>
          </div>
        )}
      </div>
    </div>
  )
}
