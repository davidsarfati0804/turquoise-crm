'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { CheckCircle, Send, FileText, Edit } from 'lucide-react'

export function ActionsSidebar({ clientFile }: { clientFile: any }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleStatusChange = async (newStatus: string, label: string) => {
    if (!confirm(`Passer le dossier à "${label}" ?`)) return

    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('client_files')
      .update({ crm_status: newStatus })
      .eq('id', clientFile.id)

    if (error) {
      console.error('Error updating status:', error)
      alert('Erreur lors du changement de statut')
    } else {
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">⚡ Actions rapides</h2>

      <div className="space-y-3">
        {/* Changer statut */}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase mb-2">Changer statut CRM</p>
          <div className="grid grid-cols-1 gap-2">
            {[
              { status: 'inscription_en_cours', label: 'Inscription en cours', emoji: '📝', color: 'blue' },
              { status: 'bulletin_pret', label: 'Bulletin prêt', emoji: '📋', color: 'purple' },
              { status: 'valide', label: 'Validé', emoji: '✅', color: 'green' },
              { status: 'paiement_en_attente', label: 'Paiement en attente', emoji: '⏳', color: 'yellow' },
              { status: 'paye', label: 'Payé', emoji: '💰', color: 'turquoise' },
              { status: 'annule', label: 'Annulé', emoji: '❌', color: 'red' },
            ].map(({ status, label, emoji, color }) => {
              const isActive = clientFile.crm_status === status
              const colorMap: Record<string, string> = {
                blue: 'bg-blue-50 hover:bg-blue-100 text-blue-700',
                purple: 'bg-purple-50 hover:bg-purple-100 text-purple-700',
                green: 'bg-green-50 hover:bg-green-100 text-green-700',
                yellow: 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700',
                turquoise: 'bg-turquoise-50 hover:bg-turquoise-100 text-turquoise-700',
                red: 'bg-red-50 hover:bg-red-100 text-red-700',
              }
              return (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status, label)}
                  disabled={loading || isActive}
                  className={`w-full px-3 py-2 text-sm rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center ${colorMap[color]} ${isActive ? 'ring-2 ring-offset-1 ring-current' : ''}`}
                >
                  <span className="mr-2">{emoji}</span>
                  {label}
                  {isActive && <span className="ml-auto text-xs font-bold">← actuel</span>}
                </button>
              )
            })}
          </div>
        </div>

        <hr className="border-gray-200 my-4" />

        <Link
          href={`/dashboard/dossiers/${clientFile.id}/modifier`}
          className="w-full px-4 py-2 bg-turquoise-600 hover:bg-turquoise-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
        >
          <Edit className="w-4 h-4 mr-2" />
          Modifier le dossier
        </Link>

        <div className="w-full px-4 py-2 bg-gray-100 text-gray-400 rounded-lg font-medium flex items-center justify-center cursor-not-allowed" title="Prochainement disponible">
          <Send className="w-4 h-4 mr-2" />
          Lien paiement (bientôt)
        </div>

        <div className="w-full px-4 py-2 bg-gray-100 text-gray-400 rounded-lg font-medium flex items-center justify-center cursor-not-allowed" title="Prochainement disponible">
          <FileText className="w-4 h-4 mr-2" />
          Facture (bientôt)
        </div>
      </div>
    </div>
  )
}
