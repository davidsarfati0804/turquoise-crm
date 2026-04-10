'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { CheckCircle, Send, FileText, DollarSign, XCircle, Edit } from 'lucide-react'

export function ActionsSidebar({ clientFile }: { clientFile: any }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleStatusChange = async (newStatus: string) => {
    if (!confirm(`Changer le statut à "${newStatus}" ?`)) return

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

  const handleSendPaymentLink = async () => {
    alert('Fonctionnalité "Envoyer lien BRED" - À venir')
  }

  const handleCancel = async () => {
    if (!confirm('Êtes-vous sûr de vouloir annuler ce dossier ?')) return

    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('client_files')
      .update({ crm_status: 'annule' })
      .eq('id', clientFile.id)

    if (error) {
      console.error('Error cancelling file:', error)
      alert('Erreur lors de l\'annulation')
    } else {
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 sticky top-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">⚡ Actions rapides</h2>

      <div className="space-y-3">
        {/* Changer statut */}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase mb-2">Changer statut CRM</p>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => handleStatusChange('inscription_en_cours')}
              disabled={loading}
              className="w-full px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              📝 Inscription en cours
            </button>
            <button
              onClick={() => handleStatusChange('bulletin_pret')}
              disabled={loading}
              className="w-full px-3 py-2 text-sm bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              📋 Bulletin prêt
            </button>
            <button
              onClick={() => handleStatusChange('valide')}
              disabled={loading}
              className="w-full px-3 py-2 text-sm bg-green-50 hover:bg-green-100 text-green-700 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4 inline mr-1" />
              Valider
            </button>
            <button
              onClick={() => handleStatusChange('paiement_en_attente')}
              disabled={loading}
              className="w-full px-3 py-2 text-sm bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              ⏳ Paiement en attente
            </button>
            <button
              onClick={() => handleStatusChange('paye')}
              disabled={loading}
              className="w-full px-3 py-2 text-sm bg-turquoise-50 hover:bg-turquoise-100 text-turquoise-700 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              💰 Payé
            </button>
          </div>
        </div>

        <hr className="border-gray-200 my-4" />

        {/* Autres actions */}
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

        <hr className="border-gray-200 my-4" />

        <button
          onClick={handleCancel}
          disabled={loading || clientFile.crm_status === 'annule'}
          className="w-full px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
        >
          <XCircle className="w-4 h-4 mr-2" />
          Annuler le dossier
        </button>
      </div>
    </div>
  )
}
