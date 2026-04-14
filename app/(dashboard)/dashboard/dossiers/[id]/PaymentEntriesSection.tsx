'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Loader2, CreditCard } from 'lucide-react'

const METHOD_LABELS: Record<string, string> = {
  cb:       '💳 CB',
  virement: '🏦 Virement',
  cheque:   '📄 Chèque',
  especes:  '💵 Espèces',
}

interface PaymentEntry {
  id: string
  amount: number
  payment_method: string | null
  payment_date: string
  notes: string | null
}

interface Props {
  clientFile: {
    id: string
    quoted_price?: number | null
  }
  initialEntries: PaymentEntry[]
}

export function PaymentEntriesSection({ clientFile, initialEntries }: Props) {
  const router = useRouter()
  const [entries, setEntries] = useState<PaymentEntry[]>(initialEntries)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Form state
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')

  const totalPaid = entries.reduce((s, e) => s + (e.amount || 0), 0)
  const quotedPrice = clientFile.quoted_price || 0
  const balance = Math.max(0, quotedPrice - totalPaid)

  async function recalcClientFile(newEntries: PaymentEntry[]) {
    const total = newEntries.reduce((s, e) => s + (e.amount || 0), 0)
    const bal = Math.max(0, quotedPrice - total)
    const status = total >= quotedPrice && quotedPrice > 0 ? 'paid' : total > 0 ? 'partial' : 'pending'
    const supabase = createClient()
    await supabase.from('client_files').update({
      amount_paid: total,
      balance_due: bal,
      payment_status: status,
    }).eq('id', clientFile.id)
  }

  const handleAdd = async () => {
    const parsed = parseFloat(amount)
    if (!parsed || parsed <= 0) return
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('payment_entries')
      .insert({
        client_file_id: clientFile.id,
        amount: parsed,
        payment_method: method || null,
        payment_date: date,
        notes: notes || null,
      })
      .select()
      .single()

    if (!error && data) {
      const newEntries = [...entries, data as PaymentEntry]
      setEntries(newEntries)
      await recalcClientFile(newEntries)
      setAmount('')
      setMethod('')
      setNotes('')
      setDate(new Date().toISOString().slice(0, 10))
      setShowForm(false)
      router.refresh()
    }
    setSaving(false)
  }

  const handleDelete = async (entryId: string) => {
    setDeleting(entryId)
    const supabase = createClient()
    const { error } = await supabase.from('payment_entries').delete().eq('id', entryId)
    if (!error) {
      const newEntries = entries.filter(e => e.id !== entryId)
      setEntries(newEntries)
      await recalcClientFile(newEntries)
      router.refresh()
    }
    setDeleting(null)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">💳 Paiement</h2>
        <button
          onClick={() => setShowForm(v => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-turquoise-600 hover:bg-turquoise-700 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Ajouter un versement
        </button>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-400 mb-0.5">Total devis</p>
          <p className="font-bold text-gray-900">{quotedPrice > 0 ? `${quotedPrice.toLocaleString('fr-FR')} €` : '—'}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-xs text-green-600 mb-0.5">Encaissé</p>
          <p className="font-bold text-green-700">{totalPaid.toLocaleString('fr-FR')} €</p>
        </div>
        <div className={`rounded-lg p-3 text-center ${balance > 0 ? 'bg-orange-50' : 'bg-green-50'}`}>
          <p className={`text-xs mb-0.5 ${balance > 0 ? 'text-orange-500' : 'text-green-600'}`}>Solde restant</p>
          <p className={`font-bold ${balance > 0 ? 'text-orange-700' : 'text-green-700'}`}>
            {balance > 0 ? `${balance.toLocaleString('fr-FR')} €` : '✅ Soldé'}
          </p>
        </div>
      </div>

      {/* Formulaire ajout versement */}
      {showForm && (
        <div className="border border-turquoise-200 rounded-xl p-4 mb-4 bg-turquoise-50/40 space-y-3">
          <p className="text-sm font-semibold text-turquoise-800">Nouveau versement</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Montant (€) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Ex: 1000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-turquoise-500"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Mode de paiement</label>
              <select
                value={method}
                onChange={e => setMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-turquoise-500"
              >
                <option value="">-- Non renseigné --</option>
                <option value="cb">💳 Carte bancaire</option>
                <option value="virement">🏦 Virement</option>
                <option value="cheque">📄 Chèque</option>
                <option value="especes">💵 Espèces</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-turquoise-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Notes (optionnel)</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ex: acompte"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-turquoise-500"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAdd}
              disabled={saving || !amount}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-turquoise-600 hover:bg-turquoise-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {saving ? 'Enregistrement...' : 'Ajouter'}
            </button>
            <button
              onClick={() => { setShowForm(false); setAmount(''); setMethod(''); setNotes('') }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste des versements */}
      {entries.length > 0 ? (
        <div className="space-y-2">
          {entries
            .slice()
            .sort((a, b) => a.payment_date.localeCompare(b.payment_date))
            .map(entry => (
              <div key={entry.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-2.5 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{entry.amount.toLocaleString('fr-FR')} €</span>
                      {entry.payment_method && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {METHOD_LABELS[entry.payment_method] || entry.payment_method}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">
                        {new Date(entry.payment_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </span>
                      {entry.notes && <span className="text-xs text-gray-400 italic">· {entry.notes}</span>}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(entry.id)}
                  disabled={deleting === entry.id}
                  className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Supprimer ce versement"
                >
                  {deleting === entry.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}

          {/* Barre de progression */}
          {quotedPrice > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{Math.round((totalPaid / quotedPrice) * 100)}% payé</span>
                <span>{totalPaid.toLocaleString('fr-FR')} / {quotedPrice.toLocaleString('fr-FR')} €</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${totalPaid >= quotedPrice ? 'bg-green-500' : 'bg-turquoise-500'}`}
                  style={{ width: `${Math.min(100, (totalPaid / quotedPrice) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-400 text-sm">
          <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-20" />
          Aucun versement enregistré
        </div>
      )}

      {/* Liens de paiement existants */}
      {(clientFile as any).payment_links?.length > 0 && (
        <div className="border-t border-gray-100 pt-4 mt-4 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Liens de paiement</p>
          {(clientFile as any).payment_links.map((link: any) => (
            <div key={link.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-3">
              <span className="font-medium text-gray-900 text-sm">{link.amount?.toLocaleString('fr-FR')} €</span>
              <div className="flex items-center gap-2">
                {link.payment_link && (
                  <a href={link.payment_link} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-turquoise-600 hover:underline">Voir →</a>
                )}
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                  link.status === 'paid' ? 'bg-green-100 text-green-800' :
                  link.status === 'sent' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>{link.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
