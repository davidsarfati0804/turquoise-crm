'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, Plus, Trash2 } from 'lucide-react'

export function NotesSection({ clientFile }: { clientFile: any }) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [saving, setSaving] = useState(false)

  const handleAddNote = async () => {
    if (!noteText.trim()) return

    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('internal_notes')
      .insert([{
        client_file_id: clientFile.id,
        content: noteText
      }])

    if (error) {
      console.error('Error adding note:', error)
      alert('Erreur lors de l\'ajout de la note')
    } else {
      setNoteText('')
      setAdding(false)
      router.refresh()
    }

    setSaving(false)
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Supprimer cette note ?')) return

    const supabase = createClient()
    const { error } = await supabase
      .from('internal_notes')
      .delete()
      .eq('id', noteId)

    if (!error) {
      router.refresh()
    }
  }

  const notes = clientFile.internal_notes || []

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">📝 Notes internes</h2>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center px-3 py-1.5 bg-turquoise-600 hover:bg-turquoise-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4 mr-1" />
            Ajouter
          </button>
        )}
      </div>

      {adding && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Écrivez votre note..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
          />
          <div className="flex items-center justify-end space-x-2 mt-3">
            <button
              onClick={() => {
                setAdding(false)
                setNoteText('')
              }}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleAddNote}
              disabled={saving || !noteText.trim()}
              className="px-4 py-2 bg-turquoise-600 hover:bg-turquoise-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? 'Ajout...' : 'Ajouter la note'}
            </button>
          </div>
        </div>
      )}

      {notes.length > 0 ? (
        <div className="space-y-3">
          {notes.map((note: any) => (
            <div key={note.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{note.content}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(note.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="ml-4 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Aucune note pour ce dossier</p>
        </div>
      )}
    </div>
  )
}
