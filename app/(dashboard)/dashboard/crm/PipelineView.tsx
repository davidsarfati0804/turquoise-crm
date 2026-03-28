'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { User, Calendar, Users, DollarSign } from 'lucide-react'

const STATUSES = [
  { id: 'lead', label: 'Lead', color: 'bg-gray-100 border-gray-300' },
  { id: 'inscription_en_cours', label: 'Inscription en cours', color: 'bg-blue-50 border-blue-300' },
  { id: 'bulletin_pret', label: 'Bulletin prêt', color: 'bg-purple-50 border-purple-300' },
  { id: 'valide', label: 'Validé', color: 'bg-green-50 border-green-300' },
  { id: 'paiement_en_attente', label: 'Paiement en attente', color: 'bg-yellow-50 border-yellow-300' },
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
        file.id === draggingId 
          ? { ...file, crm_status: newStatus }
          : file
      ))
    }

    setDraggingId(null)
  }

  const getFilesForStatus = (status: string) => {
    return files.filter(file => file.crm_status === status)
  }

  return (
    <div className="flex space-x-4 overflow-x-auto pb-4">
      {STATUSES.map(status => {
        const statusFiles = getFilesForStatus(status.id)
        const totalAmount = statusFiles.reduce((sum, file) => sum + (file.quoted_price || 0), 0)

        return (
          <div
            key={status.id}
            className="flex-shrink-0 w-80"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status.id)}
          >
            <div className={`rounded-lg border-2 ${status.color} min-h-[600px]`}>
              <div className="p-4 border-b border-gray-200 bg-white rounded-t-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{status.label}</h3>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-xs font-bold text-gray-700">
                    {statusFiles.length}
                  </span>
                </div>
                {totalAmount > 0 && (
                  <p className="text-sm font-medium text-gray-600">
                    {new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(totalAmount)}€
                  </p>
                )}
              </div>

              <div className="p-3 space-y-3">
                {statusFiles.map(file => (
                  <div
                    key={file.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, file.id)}
                    className="bg-white rounded-lg shadow border border-gray-200 p-4 cursor-move hover:shadow-lg transition-shadow"
                  >
                    <Link href={`/dashboard/dossiers/${file.id}`}>
                      <div className="mb-3">
                        <p className="font-semibold text-gray-900 hover:text-turquoise-600">
                          {file.leads ? `${file.leads.first_name} ${file.leads.last_name}` : 'Sans nom'}
                        </p>
                        <p className="text-xs text-turquoise-600 font-mono mt-1">
                          {file.file_reference}
                        </p>
                      </div>

                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          <span className="text-xs">{file.events?.name || '—'}</span>
                        </div>

                        {file.room_types && (
                          <div className="flex items-center">
                            <span className="text-xs">🛏️ {file.room_types.name}</span>
                          </div>
                        )}

                        {file.adults_count || file.children_count || file.babies_count ? (
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="text-xs">
                              {file.adults_count || 0}A {file.children_count || 0}E {file.babies_count || 0}B
                            </span>
                          </div>
                        ) : null}

                        {file.quoted_price && (
                          <div className="flex items-center">
                            <DollarSign className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="text-xs font-semibold">{file.quoted_price.toLocaleString('fr-FR')} €</span>
                          </div>
                        )}

                        {file.assigned_to && (
                          <div className="flex items-center mt-3 pt-3 border-t border-gray-100">
                            <User className="w-3 h-3 mr-1 text-gray-400" />
                            <span className="text-xs text-gray-500">{file.assigned_to}</span>
                          </div>
                        )}

                        <div className="text-xs text-gray-400 mt-2">
                          {new Date(file.updated_at).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
