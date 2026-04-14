'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Download, Loader2 } from 'lucide-react'

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cb: 'Carte bancaire',
  virement: 'Virement',
  cheque: 'Chèque',
  especes: 'Espèces',
}

interface ComptaFile {
  id: string
  file_reference: string
  primary_contact_first_name: string
  primary_contact_last_name: string
  quoted_price: number | null
  amount_paid: number | null
  balance_due: number | null
  payment_status: string
  payment_method: string | null
  crm_status: string
}

export function ComptaTab({ eventId }: { eventId: string }) {
  const [files, setFiles] = useState<ComptaFile[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('client_files')
      .select('id, file_reference, primary_contact_first_name, primary_contact_last_name, quoted_price, amount_paid, balance_due, payment_status, payment_method, crm_status')
      .eq('event_id', eventId)
      .order('primary_contact_last_name')
    setFiles((data || []) as ComptaFile[])
    setLoading(false)
  }, [eventId])

  useEffect(() => { load() }, [load])

  const totalDevis = files.reduce((s, f) => s + (f.quoted_price || 0), 0)
  const totalEncaisse = files.reduce((s, f) => s + (f.amount_paid || 0), 0)
  const totalSolde = files.reduce((s, f) => s + (f.balance_due || 0), 0)

  const exportCSV = () => {
    const header = ['Référence', 'Prénom', 'Nom', 'Montant total', 'Encaissé', 'Solde restant', 'Mode de paiement', 'Statut paiement']
    const rows = files.map(f => [
      f.file_reference,
      f.primary_contact_first_name || '',
      f.primary_contact_last_name || '',
      f.quoted_price ?? '',
      f.amount_paid ?? 0,
      f.balance_due ?? '',
      PAYMENT_METHOD_LABELS[f.payment_method || ''] || f.payment_method || '',
      f.payment_status || '',
    ])
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `compta-evenement-${eventId}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-5 h-5 animate-spin text-gray-400 mr-2" />
      <span className="text-gray-500 text-sm">Chargement...</span>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Résumé chiffres */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1">Total devis</p>
          <p className="text-2xl font-bold text-blue-800">{totalDevis.toLocaleString('fr-FR')} €</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-xs font-semibold text-green-500 uppercase tracking-wide mb-1">Encaissé</p>
          <p className="text-2xl font-bold text-green-700">{totalEncaisse.toLocaleString('fr-FR')} €</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wide mb-1">Solde restant</p>
          <p className="text-2xl font-bold text-orange-700">{totalSolde.toLocaleString('fr-FR')} €</p>
        </div>
      </div>

      {/* Export */}
      <div className="flex justify-end">
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-700 text-white text-sm font-medium rounded-lg hover:bg-teal-800 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Réf.</th>
              <th className="text-left px-4 py-3">Prénom</th>
              <th className="text-left px-4 py-3">Nom</th>
              <th className="text-right px-4 py-3">Montant total</th>
              <th className="text-right px-4 py-3">Encaissé</th>
              <th className="text-right px-4 py-3">Solde</th>
              <th className="text-left px-4 py-3">Mode paiement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {files.map(f => (
              <tr key={f.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{f.file_reference}</td>
                <td className="px-4 py-2.5 text-gray-900">{f.primary_contact_first_name || '—'}</td>
                <td className="px-4 py-2.5 text-gray-900 font-medium">{f.primary_contact_last_name || '—'}</td>
                <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                  {f.quoted_price != null ? `${f.quoted_price.toLocaleString('fr-FR')} €` : '—'}
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-green-600">
                  {f.amount_paid != null ? `${f.amount_paid.toLocaleString('fr-FR')} €` : '0 €'}
                </td>
                <td className={`px-4 py-2.5 text-right font-medium ${(f.balance_due || 0) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {f.balance_due != null ? `${f.balance_due.toLocaleString('fr-FR')} €` : '—'}
                </td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">
                  {PAYMENT_METHOD_LABELS[f.payment_method || ''] || <span className="text-gray-300">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
          {files.length === 0 && (
            <tbody>
              <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">Aucun dossier pour cet événement</td></tr>
            </tbody>
          )}
        </table>
      </div>
    </div>
  )
}
