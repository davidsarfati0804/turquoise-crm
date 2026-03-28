'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface RoomType {
  id: string
  code: string
  name: string
  description: string
}

interface Props {
  event: any
  roomTypes: RoomType[]
  existingPricing: any[]
}

export function EditEventForm({ event, roomTypes, existingPricing }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Initialize room pricing from existing data
  const initialPricing: Record<string, string> = {}
  roomTypes.forEach(rt => {
    const existing = existingPricing.find(p => p.room_type_id === rt.id)
    initialPricing[rt.id] = existing ? String(existing.price_per_night) : ''
  })
  const [roomPricing, setRoomPricing] = useState<Record<string, string>>(initialPricing)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)

    const arrivalDate = formData.get('arrival_date') as string
    const departureDate = formData.get('departure_date') as string
    let nightsCount = null
    if (arrivalDate && departureDate) {
      const arrival = new Date(arrivalDate)
      const departure = new Date(departureDate)
      nightsCount = Math.floor((departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24))
    }

    const data = {
      name: formData.get('name') as string,
      event_type: formData.get('event_type') as string,
      destination_label: formData.get('destination_label') as string,
      status: formData.get('status') as string,
      arrival_date: arrivalDate || null,
      departure_date: departureDate || null,
      nights_count: nightsCount,
      check_in_time: formData.get('check_in_time') || '15:00:00',
      check_out_time: formData.get('check_out_time') || '12:00:00',
      pension_type: formData.get('pension_type') || 'pension_complete',
      pension_details: formData.get('pension_details') || null,
      nounou_included: formData.get('nounou_included') === 'on',
      nounou_details: formData.get('nounou_details') || null,
      notes: formData.get('notes') || null,
    }

    const supabase = createClient()

    const { error: updateError } = await supabase
      .from('events')
      .update(data)
      .eq('id', event.id)

    if (updateError) {
      setError('Erreur: ' + updateError.message)
      setLoading(false)
      return
    }

    // Update room pricing: delete old, insert new
    await supabase.from('event_room_pricing').delete().eq('event_id', event.id)

    const pricingToInsert = Object.entries(roomPricing)
      .filter(([, price]) => price && parseFloat(price) > 0)
      .map(([room_type_id, price]) => ({
        event_id: event.id,
        room_type_id,
        price_per_night: parseFloat(price),
        currency: 'EUR',
        is_active: true
      }))

    if (pricingToInsert.length > 0) {
      const { error: pricingError } = await supabase
        .from('event_room_pricing')
        .insert(pricingToInsert)

      if (pricingError) {
        setError('Événement modifié mais erreur prix: ' + pricingError.message)
        setLoading(false)
        return
      }
    }

    router.push(`/dashboard/evenements/${event.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Nom de l'événement *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          defaultValue={event.name}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="event_type" className="block text-sm font-medium text-gray-700 mb-1">
            Type *
          </label>
          <select
            id="event_type"
            name="event_type"
            required
            defaultValue={event.event_type}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
          >
            <option value="sejour">🏖️ Séjour</option>
            <option value="mariage">💒 Mariage</option>
          </select>
        </div>

        <div>
          <label htmlFor="destination_label" className="block text-sm font-medium text-gray-700 mb-1">
            Destination *
          </label>
          <input
            type="text"
            id="destination_label"
            name="destination_label"
            required
            defaultValue={event.destination_label}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            Statut
          </label>
          <select
            id="status"
            name="status"
            defaultValue={event.status}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
          >
            <option value="draft">📝 Brouillon</option>
            <option value="upcoming">🔜 À venir</option>
            <option value="active">✅ Actif</option>
            <option value="completed">🏁 Terminé</option>
            <option value="cancelled">❌ Annulé</option>
          </select>
        </div>
      </div>

      {/* Dates */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📅 Dates de voyage</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="arrival_date" className="block text-sm font-medium text-gray-700 mb-1">
              Date d'arrivée
            </label>
            <input type="date" id="arrival_date" name="arrival_date"
              defaultValue={event.arrival_date?.split('T')[0] || ''}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="departure_date" className="block text-sm font-medium text-gray-700 mb-1">
              Date de retour
            </label>
            <input type="date" id="departure_date" name="departure_date"
              defaultValue={event.departure_date?.split('T')[0] || ''}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Hébergement */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🏨 Hébergement</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="check_in_time" className="block text-sm font-medium text-gray-700 mb-1">Check-in</label>
            <input type="time" id="check_in_time" name="check_in_time"
              defaultValue={event.check_in_time?.substring(0, 5) || '15:00'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="check_out_time" className="block text-sm font-medium text-gray-700 mb-1">Check-out</label>
            <input type="time" id="check_out_time" name="check_out_time"
              defaultValue={event.check_out_time?.substring(0, 5) || '12:00'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="pension_type" className="block text-sm font-medium text-gray-700 mb-1">Type de pension</label>
            <select id="pension_type" name="pension_type" defaultValue={event.pension_type || 'pension_complete'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent">
              <option value="pension_complete">Pension complète</option>
              <option value="demi_pension">Demi-pension</option>
              <option value="all_inclusive">All inclusive</option>
              <option value="petit_dejeuner">Petit déjeuner</option>
            </select>
          </div>
          <div>
            <label htmlFor="pension_details" className="block text-sm font-medium text-gray-700 mb-1">Détails pension</label>
            <input type="text" id="pension_details" name="pension_details"
              defaultValue={event.pension_details || ''}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="flex items-center space-x-2">
            <input type="checkbox" id="nounou_included" name="nounou_included"
              defaultChecked={event.nounou_included}
              className="w-4 h-4 text-turquoise-600 border-gray-300 rounded focus:ring-turquoise-500"
            />
            <span className="text-sm font-medium text-gray-700">Nounou privée incluse (enfants -4ans)</span>
          </label>
          <input type="text" id="nounou_details" name="nounou_details"
            defaultValue={event.nounou_details || ''}
            placeholder="Détails du service nounou..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent mt-2"
          />
        </div>
      </div>

      {/* Prix chambres */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">💶 Prix des chambres</h3>
        <div className="space-y-4">
          {roomTypes.map(roomType => (
            <div key={roomType.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2">{roomType.name}</h4>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Prix par nuit (€)"
                value={roomPricing[roomType.id] || ''}
                onChange={(e) => setRoomPricing(prev => ({ ...prev, [roomType.id]: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="border-t pt-6">
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea id="notes" name="notes" rows={3} defaultValue={event.notes || ''}
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
