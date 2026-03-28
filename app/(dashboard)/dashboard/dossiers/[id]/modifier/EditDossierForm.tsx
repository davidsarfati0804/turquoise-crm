'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  clientFile: any
  roomTypes: { id: string; code: string; name: string }[]
  events: { id: string; name: string; destination_label: string }[]
}

export function EditDossierForm({ clientFile, roomTypes, events }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)

    const data = {
      event_id: (formData.get('event_id') as string) || null,
      primary_contact_first_name: formData.get('primary_contact_first_name') as string,
      primary_contact_last_name: formData.get('primary_contact_last_name') as string,
      primary_contact_phone: formData.get('primary_contact_phone') as string,
      primary_contact_email: (formData.get('primary_contact_email') as string) || null,
      selected_room_type_id: (formData.get('selected_room_type_id') as string) || null,
      quoted_price: formData.get('quoted_price') ? parseFloat(formData.get('quoted_price') as string) : null,
      adults_count: parseInt(formData.get('adults_count') as string) || 1,
      children_count: parseInt(formData.get('children_count') as string) || 0,
      babies_count: parseInt(formData.get('babies_count') as string) || 0,
      notes: (formData.get('notes') as string) || null,
      assigned_to: (formData.get('assigned_to') as string) || null,
    }

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('client_files')
      .update(data)
      .eq('id', clientFile.id)

    if (updateError) {
      setError('Erreur: ' + updateError.message)
      setLoading(false)
      return
    }

    router.push(`/dashboard/dossiers/${clientFile.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Événement */}
      <div>
        <label htmlFor="event_id" className="block text-sm font-medium text-gray-700 mb-1">
          Événement
        </label>
        <select
          id="event_id"
          name="event_id"
          defaultValue={clientFile.event_id || ''}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
        >
          <option value="">-- Aucun événement --</option>
          {events.map(event => (
            <option key={event.id} value={event.id}>
              {event.name}{event.destination_label ? ` - ${event.destination_label}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Contact principal */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">👤 Contact principal</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="primary_contact_first_name" className="block text-sm font-medium text-gray-700 mb-1">
              Prénom *
            </label>
            <input
              type="text"
              id="primary_contact_first_name"
              name="primary_contact_first_name"
              required
              defaultValue={clientFile.primary_contact_first_name}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="primary_contact_last_name" className="block text-sm font-medium text-gray-700 mb-1">
              Nom *
            </label>
            <input
              type="text"
              id="primary_contact_last_name"
              name="primary_contact_last_name"
              required
              defaultValue={clientFile.primary_contact_last_name}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="primary_contact_phone" className="block text-sm font-medium text-gray-700 mb-1">
              Téléphone *
            </label>
            <input
              type="tel"
              id="primary_contact_phone"
              name="primary_contact_phone"
              required
              defaultValue={clientFile.primary_contact_phone}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="primary_contact_email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="primary_contact_email"
              name="primary_contact_email"
              defaultValue={clientFile.primary_contact_email || ''}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Chambre & Prix */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">💼 Commercial</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="selected_room_type_id" className="block text-sm font-medium text-gray-700 mb-1">
              Type de chambre
            </label>
            <select
              id="selected_room_type_id"
              name="selected_room_type_id"
              defaultValue={clientFile.selected_room_type_id || ''}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
            >
              <option value="">-- Non défini --</option>
              {roomTypes.map(rt => (
                <option key={rt.id} value={rt.id}>{rt.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="quoted_price" className="block text-sm font-medium text-gray-700 mb-1">
              Prix total (€)
            </label>
            <input
              type="number"
              id="quoted_price"
              name="quoted_price"
              step="0.01"
              min="0"
              defaultValue={clientFile.quoted_price || ''}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Voyageurs */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">✈️ Voyageurs</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="adults_count" className="block text-sm font-medium text-gray-700 mb-1">Adultes</label>
            <input type="number" id="adults_count" name="adults_count" min="1"
              defaultValue={clientFile.adults_count || 1}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="children_count" className="block text-sm font-medium text-gray-700 mb-1">Enfants</label>
            <input type="number" id="children_count" name="children_count" min="0"
              defaultValue={clientFile.children_count || 0}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="babies_count" className="block text-sm font-medium text-gray-700 mb-1">Bébés</label>
            <input type="number" id="babies_count" name="babies_count" min="0"
              defaultValue={clientFile.babies_count || 0}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Assigné à */}
      <div className="border-t pt-6">
        <label htmlFor="assigned_to" className="block text-sm font-medium text-gray-700 mb-1">
          Assigné à
        </label>
        <input
          type="text"
          id="assigned_to"
          name="assigned_to"
          defaultValue={clientFile.assigned_to || ''}
          placeholder="Nom du collaborateur"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
        />
      </div>

      {/* Notes */}
      <div className="border-t pt-6">
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea id="notes" name="notes" rows={3} defaultValue={clientFile.notes || ''}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
        />
      </div>

      <div className="flex items-center justify-end space-x-4 pt-4">
        <button type="button" onClick={() => router.back()}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors">
          Annuler
        </button>
        <button type="submit" disabled={loading}
          className="px-6 py-2 bg-turquoise-600 hover:bg-turquoise-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
          {loading ? 'Sauvegarde...' : 'Enregistrer les modifications'}
        </button>
      </div>
    </form>
  )
}
