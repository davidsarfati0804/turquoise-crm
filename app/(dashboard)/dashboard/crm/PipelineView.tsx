'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const STATUSES = [
  { id: 'lead', label: 'Lead', col: 'bg-gray-50 border-gray-300', head: 'bg-gray-100' },
  { id: 'inscription_en_cours', label: 'Inscription', col: 'bg-blue-50 border-blue-200', head: 'bg-blue-100' },
  { id: 'bulletin_pret', label: 'Bulletin prêt', col: 'bg-purple-50 border-purple-200', head: 'bg-purple-100' },
  { id: 'valide', label: 'Validé', col: 'bg-green-50 border-green-200', head: 'bg-green-100' },
  { id: 'paiement_en_attente', label: 'Paiement', col: 'bg-yellow-50 border-yellow-200', head: 'bg-yellow-100' },
  { id: 'paye', label: 'Payé', col: 'bg-teal-50 border-teal-200', head: 'bg-teal-100' },
  { id: 'annule', label: 'Annulé', col: 'bg-red-50 border-red-200', head: 'bg-red-100' },
]

// Couleurs par événement (palette cyclique)
const EVENT_COLORS = [
  'bg-sky-100 text-sky-700 border-sky-200',
  'bg-violet-100 text-violet-700 border-violet-200',
  'bg-emerald-100 text-emerald-700 border-emerald-200',
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-pink-100 text-pink-700 border-pink-200',
  'bg-indigo-100 text-indigo-700 border-indigo-200',
  'bg-amber-100 text-amber-700 border-amber-200',
]

export function PipelineView({ clientFiles }: { clientFiles: any[] }) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [files, setFiles] = useState(clientFiles)

  // Index couleur par event_id
  const eventIds = [...new Set(files.map(f => f.event_id).filter(Boolean))]
  const eventColorMap: Record<string, string> = {}
  eventIds.forEach((id, i) => { eventColorMap[id] = EVENT_COLORS[i % EVENT_COLORS.length] })

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
      setFiles(prev => prev.map(f => f.id === draggingId ? { ...f, crm_status: newStatus } : f))
    }
    setDraggingId(null)
  }

  const getFilesForStatus = (status: string) => files.filter(f => f.crm_status === status)

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 items-start">
      {STATUSES.map(status => {
        const statusFiles = getFilesForStatus(status.id)
        const totalAmount = statusFiles.reduce((sum, f) => sum + (f.quoted_price || 0), 0)

        return (
          <div
            key={status.id}
            className={`flex-shrink-0 w-48 rounded-xl border ${status.col}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status.id)}
          >
            {/* En-tête colonne */}
            <div className={`px-3 py-2 rounded-t-xl ${status.head} flex items-center justify-between`}>
              <span className="text-xs font-bold text-gray-700 truncate">{status.label}</span>
              <span className="text-xs font-bold text-gray-500 bg-white rounded-full w-5 h-5 flex items-center justify-center ml-1 flex-shrink-0">
                {statusFiles.length}
              </span>
            </div>
            {totalAmount > 0 && (
              <div className="px-3 py-1 text-xs font-medium text-gray-500 border-b border-gray-200/60">
                {new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 0 }).format(totalAmount)}€
              </div>
            )}

            {/* Cartes */}
            <div className="p-2 space-y-1.5 min-h-[120px]">
              {statusFiles.map(file => {
                const name = file.primary_contact_first_name
                  ? `${file.primary_contact_first_name} ${file.primary_contact_last_name || ''}`
                  : file.leads
                  ? `${file.leads.first_name} ${file.leads.last_name}`
                  : 'Sans nom'
                const eventColor = file.event_id ? eventColorMap[file.event_id] : 'bg-gray-100 text-gray-500 border-gray-200'

                return (
                  <div
                    key={file.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, file.id)}
                    className="bg-white rounded-lg border border-gray-200 shadow-sm cursor-move hover:shadow-md hover:border-teal-300 transition-all select-none"
                  >
                    <Link href={`/dashboard/dossiers/${file.id}`} className="block p-2.5">
                      <p className="text-sm font-semibold text-gray-900 leading-tight truncate">{name}</p>
                      {file.events?.name && (
                        <span className={`inline-block mt-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded border truncate max-w-full ${eventColor}`}>
                          {file.events.name}
                        </span>
                      )}
                    </Link>
                  </div>
                )
              })}
              {statusFiles.length === 0 && (
                <div className="text-center py-4 text-xs text-gray-300">Vide</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
