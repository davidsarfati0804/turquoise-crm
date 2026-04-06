'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface RoomType {
  id: string
  code: string
  name: string
  description: string
}

interface RoomPricing {
  room_type_id: string
  price_per_night: string
}

export function EventForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [roomPricing, setRoomPricing] = useState<Record<string, RoomPricing>>({})

  useEffect(() => {
    loadRoomTypes()
  }, [])

  const loadRoomTypes = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('room_types')
      .select('*')
      .eq('is_active', true)
      .order('display_order')

    if (data) {
      setRoomTypes(data)
      // Initialiser les prix à vide pour chaque type de chambre
      const initialPricing: Record<string, RoomPricing> = {}
      data.forEach(rt => {
        initialPricing[rt.id] = {
          room_type_id: rt.id,
          price_per_night: ''
        }
      })
      setRoomPricing(initialPricing)
    }
  }

  const handlePriceChange = (roomTypeId: string, value: string) => {
    setRoomPricing(prev => ({
      ...prev,
      [roomTypeId]: {
        ...prev[roomTypeId],
        price_per_night: value
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    
    // Calculate nights if both dates are provided
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
      status: 'upcoming',
      start_date: arrivalDate ? new Date(arrivalDate).toISOString() : new Date().toISOString(),
      end_date: departureDate ? new Date(departureDate).toISOString() : new Date().toISOString(),
      // New fields
      arrival_date: arrivalDate || null,
      departure_date: departureDate || null,
      nights_count: nightsCount,
      check_in_time: formData.get('check_in_time') || '15:00:00',
      check_out_time: formData.get('check_out_time') || '12:00:00',
      pension_type: formData.get('pension_type') || 'pension_complete',
      pension_details: formData.get('pension_details') || 'Pension complète hors boissons',
      nounou_included: formData.get('nounou_included') === 'on',
      nounou_details: formData.get('nounou_details') || null
    }

    const supabase = createClient()
    
    // 1. Créer l'événement
    const { data: event, error: insertError } = await supabase
      .from('events')
      .insert([data])
      .select()
      .single()

    if (insertError || !event) {
      console.error('Error creating event:', insertError)
      setError('Erreur lors de la création de l\'événement')
      setLoading(false)
      return
    }

    // 2. Insérer les prix des chambres (seulement ceux qui sont remplis)
    const pricingToInsert = Object.values(roomPricing)
      .filter(p => p.price_per_night && parseFloat(p.price_per_night) > 0)
      .map(p => ({
        event_id: event.id,
        room_type_id: p.room_type_id,
        price_per_night: parseFloat(p.price_per_night),
        currency: 'EUR',
        is_active: true
      }))

    if (pricingToInsert.length > 0) {
      const { error: pricingError } = await supabase
        .from('event_room_pricing')
        .insert(pricingToInsert)

      if (pricingError) {
        console.error('Error inserting pricing:', pricingError)
        setError('Événement créé mais erreur lors de l\'ajout des prix')
        setLoading(false)
        return
      }
    }

    router.push('/dashboard/evenements')
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
          placeholder="Ex: Maurice Décembre 2026"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="event_type" className="block text-sm font-medium text-gray-700 mb-1">
            Type *
          </label>
          <select
            id="event_type"
            name="event_type"
            required
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
            placeholder="Ex: Île Maurice"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* DATES DE VOYAGE */}
      <div className="border-t pt-6 mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          📅 Dates de voyage
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="arrival_date" className="block text-sm font-medium text-gray-700 mb-1">
              Date d'arrivée
            </label>
            <input
              type="date"
              id="arrival_date"
              name="arrival_date"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="departure_date" className="block text-sm font-medium text-gray-700 mb-1">
              Date de retour
            </label>
            <input
              type="date"
              id="departure_date"
              name="departure_date"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Le nombre de nuitées sera calculé automatiquement
        </p>
      </div>

      {/* HÉBERGEMENT */}
      <div className="border-t pt-6 mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🏨 Hébergement
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="check_in_time" className="block text-sm font-medium text-gray-700 mb-1">
              Check-in
            </label>
            <input
              type="time"
              id="check_in_time"
              name="check_in_time"
              defaultValue="15:00"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="check_out_time" className="block text-sm font-medium text-gray-700 mb-1">
              Check-out
            </label>
            <input
              type="time"
              id="check_out_time"
              name="check_out_time"
              defaultValue="12:00"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="pension_type" className="block text-sm font-medium text-gray-700 mb-1">
              Type de pension
            </label>
            <select
              id="pension_type"
              name="pension_type"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
            >
              <option value="pension_complete">Pension complète</option>
              <option value="demi_pension">Demi-pension</option>
              <option value="all_inclusive">All inclusive</option>
              <option value="petit_dejeuner">Petit déjeuner</option>
            </select>
          </div>

          <div>
            <label htmlFor="pension_details" className="block text-sm font-medium text-gray-700 mb-1">
              Détails pension
            </label>
            <input
              type="text"
              id="pension_details"
              name="pension_details"
              defaultValue="Pension complète hors boissons"
              placeholder="Ex: hors boissons"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="nounou_included"
              name="nounou_included"
              className="w-4 h-4 text-turquoise-600 border-gray-300 rounded focus:ring-turquoise-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Nounou privée incluse (enfants -4ans)
            </span>
          </label>
          <input
            type="text"
            id="nounou_details"
            name="nounou_details"
            placeholder="Détails du service nounou..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent mt-2"
          />
        </div>
      </div>

      {/* SECTION PRIX DES CHAMBRES */}
      <div className="border-t pt-6 mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          💶 Prix des chambres *
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Définissez le prix par nuit pour chaque type de chambre. Au moins un prix est requis.
        </p>

        <div className="space-y-4">
          {roomTypes.map(roomType => (
            <div key={roomType.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">{roomType.name}</h4>
                  {roomType.description && (
                    <p className="text-sm text-gray-600 mt-1">{roomType.description}</p>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prix par nuit (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ex: 250.00"
                  value={roomPricing[roomType.id]?.price_per_night || ''}
                  onChange={(e) => handlePriceChange(roomType.id, e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
                />
              </div>
            </div>
          ))}
        </div>

        {roomTypes.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
            ⚠️ Aucun type de chambre trouvé. Exécutez d'abord la migration SQL pour créer les types de chambres.
          </div>
        )}
      </div>

      <div className="flex items-center justify-end space-x-4 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-turquoise-600 hover:bg-turquoise-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Création...' : 'Créer l\'événement'}
        </button>
      </div>
    </form>
  )
}
