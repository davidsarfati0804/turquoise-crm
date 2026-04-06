'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const STATUSES = [
  { id: 'lead', label: 'Lead', color: 'bg-gray-100 border-gray-300' },
  { id: 'inscription_en_cours', label: 'Inscription', color: 'bg-blue-50 border-blue-300' },
  { id: 'bulletin_pret', label: 'Bulletin prêt', color: 'bg-purple-50 border-purple-300' },
  { id: 'valide', label: 'Validé', color: 'bg-green-50 border-green-300' },
  { id: 'paiement_en_attente', label: 'Paiement att.', color: 'bg-yellow-50 border-yellow-300' },
  { id: 'paye', label: 'Payé', color: 'bg-turquoise-50 border-turquoise-300' },
  { id: 'annule', label: 'Annulé', color: 'bg-red-50 border-red-300' }
]

export function PipelineView({ clientFiles }: { clientFiles: any[] }) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [files, setFiles] = useState(clientFiles)

  const handleDragStart = (e: React.DragEvent, fileId: string) => {
    setDraggingId(fileId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    if (!draggingId) return

    const supabase = createClient()
    const { error } = await supabase
      .from('client_files')
      .update({ crm_status: newStatus })
      .eq('id', draggingId)

    if (!error) {
      setFiles(prev => prev.map(file =>
        file.id === draggingId ? { ...file, crm_status: newStatus } : file
      ))
    }
    setDraggingId(null)
  }

  const getFilesForStatus = (status: string) => files.filter(f => f.crm_status === status)

  return (
    <div className="flex space-x-3 overflow-x-auto pb-4">
      {STATUSES.map(status => {
        const statusFiles = getFilesForStatus(status.id)
        const totalAmount = statusFiles.reduce((sum, f) => sum + (f.quoted_price || 0), 0)

        return (
          <div
            key={status.id}
            className="flex-shrink-0 w-52"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status.id)}
          >
            {/* En-tête colonne */}
            <div className={`rounded-t-lg border-2 border-b-0 ${status.color} bg-white px-3 py-2`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700 truncate">{status.label}</span>
                <span className="ml-1 flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 text-xs font-bold text-gray-600">
                  {statusFiles.length}
                </span>
              </div>
              {totalAmount > 0 && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(totalAmount)}€
                </p>
              )}
            </div>

            {/* Cartes */}
            <div className={`rounded-b-lg border-2 border-t-0 ${status.color} min-h-[500px] p-2 space-y-2`}>
              {statusFiles.map(file => {
                const name = file.primary_contact_first_name
                  ? `${file.primary_contact_first_name} ${file.primary_contact_last_name || ''}`
                  : file.leads
                  ? `${file.leads.first_name} ${file.leads.last_name}`
                  : 'Sans nom'

                return (
                  <div
                    key={file.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, file.id)}
                    className={`bg-white rounded border border-gray-200 px-3 py-2 cursor-move hover:shadow-md transition-shadow ${draggingId === file.id ? 'opacity-50' : ''}`}
                  >
                    <Link href={`/dashboard/dossiers/${file.id}`}>
                      <p className="text-sm font-semibold text-gray-900 hover:text-turquoise-600 truncate">
                        {name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(file.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </p>
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
