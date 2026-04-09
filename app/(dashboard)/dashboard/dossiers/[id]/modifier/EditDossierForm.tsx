'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface RoomType { id: string; code: string; name: string }
interface EventItem { id: string; name: string; destination_label: string }
interface Flight { id: string; airline: string; flight_number: string; scheduled_time: string; flight_type: 'aller' | 'retour' }

interface Props {
  clientFile: Record<string, unknown>
  roomTypes: RoomType[]
  events: EventItem[]
  flights: Flight[]
}

export function EditDossierForm({ clientFile, roomTypes, events, flights }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const flightsAller  = flights.filter(f => f.flight_type === 'aller')
  const flightsRetour = flights.filter(f => f.flight_type === 'retour')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)

    const data: Record<string, unknown> = {
      event_id:                       (formData.get('event_id') as string) || null,
      primary_contact_first_name:     formData.get('primary_contact_first_name') as string,
      primary_contact_last_name:      formData.get('primary_contact_last_name') as string,
      primary_contact_phone:          formData.get('primary_contact_phone') as string,
      primary_contact_email:          (formData.get('primary_contact_email') as string) || null,
      selected_room_type_id:          (formData.get('selected_room_type_id') as string) || null,
      quoted_price:                   formData.get('quoted_price') ? parseFloat(formData.get('quoted_price') as string) : null,
      adults_count:                   parseInt(formData.get('adults_count') as string) || 1,
      children_count:                 parseInt(formData.get('children_count') as string) || 0,
      babies_count:                   parseInt(formData.get('babies_count') as string) || 0,
      nounou_included:                formData.get('nounou_included') === 'on',
      notes:                          (formData.get('notes') as string) || null,
      assigned_to:                    (formData.get('assigned_to') as string) || null,
      room_number:                    (formData.get('room_number') as string) || null,
      // Vols
      flight_id_inbound:              (formData.get('flight_id_inbound') as string) || null,
      flight_id_outbound:             (formData.get('flight_id_outbound') as string) || null,
      flight_date_inbound:            (formData.get('flight_date_inbound') as string) || null,
      flight_date_outbound:           (formData.get('flight_date_outbound') as string) || null,
    }

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('client_files')
      .update(data)
      .eq('id', clientFile.id as string)

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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Événement */}
      <div>
        <label htmlFor="event_id" className="block text-sm font-medium text-gray-700 mb-1">Événement</label>
        <select id="event_id" name="event_id" defaultValue={(clientFile.event_id as string) || ''}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent">
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
            <label htmlFor="primary_contact_first_name" className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
            <input type="text" id="primary_contact_first_name" name="primary_contact_first_name" required
              defaultValue={clientFile.primary_contact_first_name as string}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent" />
          </div>
          <div>
            <label htmlFor="primary_contact_last_name" className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
            <input type="text" id="primary_contact_last_name" name="primary_contact_last_name" required
              defaultValue={clientFile.primary_contact_last_name as string}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent" />
          </div>
          <div>
            <label htmlFor="primary_contact_phone" className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
            <input type="tel" id="primary_contact_phone" name="primary_contact_phone" required
              defaultValue={clientFile.primary_contact_phone as string}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent" />
          </div>
          <div>
            <label htmlFor="primary_contact_email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" id="primary_contact_email" name="primary_contact_email"
              defaultValue={(clientFile.primary_contact_email as string) || ''}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent" />
          </div>
        </div>
      </div>

      {/* Vols */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">✈️ Vols</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="flight_id_inbound" className="block text-sm font-medium text-gray-700 mb-1">Vol aller (arrivée MRU)</label>
            <select id="flight_id_inbound" name="flight_id_inbound"
              defaultValue={(clientFile.flight_id_inbound as string) || ''}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent">
              <option value="">-- Aucun vol aller --</option>
              {flightsAller.map(f => (
                <option key={f.id} value={f.id}>
                  {f.flight_number} – {f.airline} ({f.scheduled_time.slice(0, 5)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="flight_date_inbound" className="block text-sm font-medium text-gray-700 mb-1">Date d&apos;arrivée</label>
            <input type="date" id="flight_date_inbound" name="flight_date_inbound"
              defaultValue={(clientFile.flight_date_inbound as string) || ''}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent" />
          </div>
          <div>
            <label htmlFor="flight_id_outbound" className="block text-sm font-medium text-gray-700 mb-1">Vol retour (départ MRU)</label>
            <select id="flight_id_outbound" name="flight_id_outbound"
              defaultValue={(clientFile.flight_id_outbound as string) || ''}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent">
              <option value="">-- Aucun vol retour --</option>
              {flightsRetour.map(f => (
                <option key={f.id} value={f.id}>
                  {f.flight_number} – {f.airline} ({f.scheduled_time.slice(0, 5)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="flight_date_outbound" className="block text-sm font-medium text-gray-700 mb-1">Date de retour</label>
            <input type="date" id="flight_date_outbound" name="flight_date_outbound"
              defaultValue={(clientFile.flight_date_outbound as string) || ''}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent" />
          </div>
        </div>
      </div>

      {/* Commercial */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">💼 Commercial</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="selected_room_type_id" className="block text-sm font-medium text-gray-700 mb-1">Type de chambre</label>
            <select id="selected_room_type_id" name="selected_room_type_id"
              defaultValue={(clientFile.selected_room_type_id as string) || ''}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent">
              <option value="">-- Non défini --</option>
              {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="quoted_price" className="block text-sm font-medium text-gray-700 mb-1">Prix total (€)</label>
            <input type="number" id="quoted_price" name="quoted_price" step="0.01" min="0"
              defaultValue={(clientFile.quoted_price as number) || ''}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent" />
          </div>
          <div>
            <label htmlFor="room_number" className="block text-sm font-medium text-gray-700 mb-1">N° de chambre</label>
            <input type="text" id="room_number" name="room_number"
              defaultValue={(clientFile.room_number as string) || ''}
              placeholder="Ex: 204"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent font-mono" />
          </div>
        </div>
      </div>

      {/* Voyageurs */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">👥 Voyageurs</h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label htmlFor="adults_count" className="block text-sm font-medium text-gray-700 mb-1">Adultes</label>
            <input type="number" id="adults_count" name="adults_count" min="1"
              defaultValue={(clientFile.adults_count as number) || 1}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent" />
          </div>
          <div>
            <label htmlFor="children_count" className="block text-sm font-medium text-gray-700 mb-1">Enfants</label>
            <input type="number" id="children_count" name="children_count" min="0"
              defaultValue={(clientFile.children_count as number) || 0}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent" />
          </div>
          <div>
            <label htmlFor="babies_count" className="block text-sm font-medium text-gray-700 mb-1">Bébés</label>
            <input type="number" id="babies_count" name="babies_count" min="0"
              defaultValue={(clientFile.babies_count as number) || 0}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent" />
          </div>
        </div>
        {/* Nounou */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input type="checkbox" id="nounou_included" name="nounou_included"
            defaultChecked={!!(clientFile.nounou_included)}
            className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
          <span className="text-sm font-medium text-gray-700">
            Nounou privée incluse <span className="text-gray-400 font-normal">(enfants &lt; 4 ans)</span>
          </span>
        </label>
      </div>

      {/* Assigné à */}
      <div className="border-t pt-6">
        <label htmlFor="assigned_to" className="block text-sm font-medium text-gray-700 mb-1">Assigné à</label>
        <input type="text" id="assigned_to" name="assigned_to"
          defaultValue={(clientFile.assigned_to as string) || ''}
          placeholder="Nom du collaborateur"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent" />
      </div>

      {/* Notes */}
      <div className="border-t pt-6">
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea id="notes" name="notes" rows={3}
          defaultValue={(clientFile.notes as string) || ''}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent" />
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
