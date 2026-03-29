'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, GitMerge, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface ManageDossierActionsProps {
  dossierId: string
  dossierReference: string
  eventId: string
}

export function ManageDossierActions({
  dossierId,
  dossierReference,
  eventId,
}: ManageDossierActionsProps) {
  const router = useRouter()
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isMergeOpen, setIsMergeOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [mergeTarget, setMergeTarget] = useState('')
  const [otherDossiers, setOtherDossiers] = useState<any[]>([])
  const [loadingOtherDossiers, setLoadingOtherDossiers] = useState(false)

  // Charger les autres dossiers de l'événement pour la fusion
  const loadOtherDossiers = async () => {
    if (!isMergeOpen) return

    setLoadingOtherDossiers(true)
    try {
      const response = await fetch(
        `/api/client-files?event_id=${eventId}&exclude=${dossierId}`
      )
      const data = await response.json()
      setOtherDossiers(data.data || [])
    } catch (error) {
      console.error('Error loading dossiers:', error)
      toast.error('Erreur lors du chargement des dossiers')
    } finally {
      setLoadingOtherDossiers(false)
    }
  }

  const handleDeleteClick = () => {
    setIsDeleteOpen(true)
  }

  const handleMergeClick = async () => {
    setIsMergeOpen(true)
    await loadOtherDossiers()
  }

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/client-files/${dossierId}/delete`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la suppression')
      }

      toast.success(`Dossier ${dossierReference} supprimé`)
      setIsDeleteOpen(false)
      router.push('/dashboard/dossiers')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erreur lors de la suppression'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleMerge = async () => {
    if (!mergeTarget) {
      toast.error('Veuillez sélectionner un dossier cible')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/client-files/${dossierId}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mergeWithId: mergeTarget }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la fusion')
      }

      const data = await response.json()
      toast.success(data.message)
      setIsMergeOpen(false)
      router.push(`/dashboard/dossiers/${mergeTarget}`)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erreur lors de la fusion'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Boutons d'actions */}
      <div className="flex gap-2">
        <button
          onClick={handleMergeClick}
          className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-medium transition-colors"
        >
          <GitMerge className="w-4 h-4 mr-2" />
          Fusionner
        </button>

        <button
          onClick={handleDeleteClick}
          className="inline-flex items-center px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg font-medium transition-colors"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Supprimer
        </button>
      </div>

      {/* Modal Suppression */}
      {isDeleteOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>

            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Supprimer ce dossier ?
            </h3>

            <p className="text-gray-600 text-center mb-6">
              Êtes-vous sûr de vouloir supprimer le dossier{' '}
              <strong>{dossierReference}</strong> ? Cette action est irréversible.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteOpen(false)}
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Fusion */}
      {isMergeOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Fusionner les dossiers
            </h3>

            <p className="text-gray-600 text-sm mb-4">
              Sélectionnez le dossier avec lequel vous souhaitez fusionner{' '}
              <strong>{dossierReference}</strong>.
            </p>

            {loadingOtherDossiers ? (
              <div className="text-center py-4">
                <p className="text-gray-500">Chargement des dossiers...</p>
              </div>
            ) : otherDossiers.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">
                  Aucun autre dossier disponible pour cet événement
                </p>
              </div>
            ) : (
              <select
                value={mergeTarget}
                onChange={(e) => setMergeTarget(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Sélectionner un dossier --</option>
                {otherDossiers.map((file: any) => (
                  <option key={file.id} value={file.id}>
                    {file.file_reference} - {file.primary_contact_first_name}{' '}
                    {file.primary_contact_last_name}
                  </option>
                ))}
              </select>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-800">
                💡 Les participants et notes du dossier source seront transférés au
                dossier cible, puis le dossier source sera supprimé.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsMergeOpen(false)
                  setMergeTarget('')
                }}
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleMerge}
                disabled={isLoading || !mergeTarget || loadingOtherDossiers}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Fusion...' : 'Fusionner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
