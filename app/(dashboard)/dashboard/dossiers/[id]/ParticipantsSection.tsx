'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Users, Plus, Edit, Trash2, Save, X } from 'lucide-react'

export function ParticipantsSection({ clientFile }: { clientFile: any }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [participants, setParticipants] = useState(clientFile.participants || [])
  const [saving, setSaving] = useState(false)

  const handleAddParticipant = () => {
    setParticipants([
      ...participants,
      {
        id: `new-${Date.now()}`,
        first_name: '',
        last_name: '',
        date_of_birth: '',
        participant_type: 'adult',
        is_new: true
      }
    ])
  }

  const handleRemoveParticipant = (index: number, name: string) => {
    if (!confirm(`Supprimer ${name || 'ce participant'} ?`)) return
    setParticipants(participants.filter((_: any, i: number) => i !== index))
  }

  const handleChange = (index: number, field: string, value: any) => {
    setParticipants(
      participants.map((p: any, i: number) =>
        i === index ? { ...p, [field]: value } : p
      )
    )
  }

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()

    // Supprimer les anciens participants
    await supabase
      .from('participants')
      .delete()
      .eq('client_file_id', clientFile.id)

    // Insérer les nouveaux
    const participantsToInsert = participants.map((p: any) => ({
      client_file_id: clientFile.id,
      first_name: p.first_name,
      last_name: p.last_name,
      date_of_birth: p.date_of_birth || null,
      participant_type: p.participant_type
    }))

    const { error } = await supabase
      .from('participants')
      .insert(participantsToInsert)

    if (error) {
      console.error('Error saving participants:', error)
      alert('Erreur lors de la sauvegarde')
    } else {
      // Sync total_participants sur le dossier
      const adults = participantsToInsert.filter((p: { participant_type: string }) => p.participant_type === 'adult').length
      const children = participantsToInsert.filter((p: { participant_type: string }) => p.participant_type === 'child').length
      const babies = participantsToInsert.filter((p: { participant_type: string }) => p.participant_type === 'baby').length
      await supabase.from('client_files').update({
        adults_count: adults || 1,
        children_count: children,
        babies_count: babies,
        total_participants: participantsToInsert.length,
      }).eq('id', clientFile.id)

      setEditing(false)
      router.refresh()
    }

    setSaving(false)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">👥 Participants</h2>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Edit className="w-4 h-4 mr-1" />
            Modifier
          </button>
        ) : (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setParticipants(clientFile.participants || [])
                setEditing(false)
              }}
              className="inline-flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              <X className="w-4 h-4 mr-1" />
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center px-3 py-1.5 bg-turquoise-600 hover:bg-turquoise-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-1" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          {participants.map((participant: any, index: number) => (
            <div key={participant.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <select
                  value={participant.participant_type}
                  onChange={(e) => handleChange(index, 'participant_type', e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="adult">👨 Adulte</option>
                  <option value="child">👧 Enfant</option>
                  <option value="baby">👶 Bébé</option>
                </select>
                <button
                  onClick={() => handleRemoveParticipant(index, `${participant.first_name} ${participant.last_name}`)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Prénom</label>
                  <input
                    type="text"
                    value={participant.first_name}
                    onChange={(e) => handleChange(index, 'first_name', e.target.value)}
                    placeholder="Prénom"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nom</label>
                  <input
                    type="text"
                    value={participant.last_name}
                    onChange={(e) => handleChange(index, 'last_name', e.target.value)}
                    placeholder="Nom"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-xs text-gray-500 mb-1">Date de naissance</label>
                <input
                  type="date"
                  value={participant.date_of_birth || ''}
                  onChange={(e) => handleChange(index, 'date_of_birth', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          ))}

          <button
            onClick={handleAddParticipant}
            className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-turquoise-500 hover:text-turquoise-600 font-medium transition-colors flex items-center justify-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Ajouter un participant
          </button>
        </div>
      ) : (
        <div>
          {participants && participants.length > 0 ? (
            <div className="space-y-3">
              {participants.map((participant: any) => (
                <div key={participant.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center">
                    <span className="text-lg mr-3">
                      {participant.participant_type === 'adult' ? '👨' :
                       participant.participant_type === 'child' ? '👧' : '👶'}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">
                        {participant.first_name} {participant.last_name}
                      </p>
                      {participant.date_of_birth && (
                        <p className="text-xs text-gray-500">
                          Né(e) le {new Date(participant.date_of_birth).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 capitalize">
                    {participant.participant_type === 'adult' ? 'Adulte' :
                     participant.participant_type === 'child' ? 'Enfant' : 'Bébé'}
                  </span>
                </div>
              ))}

              {/* Résumé */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Total:</span>{' '}
                  {participants.filter((p: any) => p.participant_type === 'adult').length} adulte(s),{' '}
                  {participants.filter((p: any) => p.participant_type === 'child').length} enfant(s),{' '}
                  {participants.filter((p: any) => p.participant_type === 'baby').length} bébé(s)
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Aucun participant ajouté</p>
          )}
        </div>
      )}
    </div>
  )
}
