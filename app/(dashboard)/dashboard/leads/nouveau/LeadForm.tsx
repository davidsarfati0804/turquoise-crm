'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Voyageur {
  first_name: string
  last_name: string
  date_of_birth: string
  type: 'adult' | 'child' | 'baby'
  arrival_date: string
  departure_date: string
  room_type_id: string
}

function diffDays(start: string, end: string): number {
  if (!start || !end) return 0
  const ms = new Date(end).getTime() - new Date(start).getTime()
  return Math.max(0, Math.round(ms / 86400000))
}

export function LeadForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [events, setEvents] = useState<any[]>([])
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [roomTypes, setRoomTypes] = useState<any[]>([])

  // Dates du séjour (globales, appliquées par défaut à tous les voyageurs)
  const [sejour_start, setSejourStart] = useState('')
  const [sejour_end, setSejourEnd] = useState('')

  // Voyageur counts
  const [adultsCount, setAdultsCount] = useState(1)
  const [childrenCount, setChildrenCount] = useState(0)
  const [babiesCount, setBabiesCount] = useState(0)
  const [voyageurs, setVoyageurs] = useState<Voyageur[]>([{
    first_name: '', last_name: '', date_of_birth: '', type: 'adult',
    arrival_date: '', departure_date: '', room_type_id: '',
  }])

  useEffect(() => {
    const loadEvents = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('events')
        .select('id, name, destination_label, start_date, arrival_date, departure_date, nights_count')
        .in('status', ['upcoming', 'active', 'draft'])
        .order('start_date', { ascending: false })

      setEvents(data || [])
    }
    loadEvents()
  }, [])

  // Quand l'événement change, charger les chambres avec prix
  useEffect(() => {
    if (!selectedEvent) {
      setRoomTypes([])
      return
    }

    const loadRoomPricing = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('event_room_pricing')
        .select('*, room_types(*)')
        .eq('event_id', selectedEvent.id)
        .eq('is_active', true)

      setRoomTypes(data || [])
    }
    loadRoomPricing()
  }, [selectedEvent])

  // Quand les compteurs changent, reconstruire la liste voyageurs
  useEffect(() => {
    const newVoyageurs: Voyageur[] = []

    for (let i = 0; i < adultsCount; i++) {
      const existing = voyageurs[newVoyageurs.length]
      newVoyageurs.push({
        first_name: existing?.first_name || '',
        last_name: existing?.last_name || '',
        date_of_birth: existing?.date_of_birth || '',
        type: 'adult',
        arrival_date: existing?.arrival_date || sejour_start,
        departure_date: existing?.departure_date || sejour_end,
        room_type_id: existing?.room_type_id || '',
      })
    }
    for (let i = 0; i < childrenCount; i++) {
      const existing = voyageurs[newVoyageurs.length]
      newVoyageurs.push({
        first_name: existing?.first_name || '',
        last_name: existing?.last_name || '',
        date_of_birth: existing?.date_of_birth || '',
        type: 'child',
        arrival_date: existing?.arrival_date || sejour_start,
        departure_date: existing?.departure_date || sejour_end,
        room_type_id: existing?.room_type_id || '',
      })
    }
    for (let i = 0; i < babiesCount; i++) {
      const existing = voyageurs[newVoyageurs.length]
      newVoyageurs.push({
        first_name: existing?.first_name || '',
        last_name: existing?.last_name || '',
        date_of_birth: existing?.date_of_birth || '',
        type: 'baby',
        arrival_date: existing?.arrival_date || sejour_start,
        departure_date: existing?.departure_date || sejour_end,
        room_type_id: existing?.room_type_id || '',
      })
    }

    setVoyageurs(newVoyageurs.length > 0 ? newVoyageurs : [{
      first_name: '', last_name: '', date_of_birth: '', type: 'adult',
      arrival_date: sejour_start, departure_date: sejour_end, room_type_id: '',
    }])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adultsCount, childrenCount, babiesCount])

  // Quand les dates de séjour changent, propager aux voyageurs sans date saisie
  useEffect(() => {
    setVoyageurs(prev => prev.map(v => ({
      ...v,
      arrival_date: v.arrival_date || sejour_start,
      departure_date: v.departure_date || sejour_end,
    })))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sejour_start, sejour_end])

  const handleEventChange = (eventId: string) => {
    const event = events.find(e => e.id === eventId)
    setSelectedEvent(event || null)
    // Pré-remplir les dates de séjour depuis l'événement si pas encore saisies
    if (event) {
      if (!sejour_start && event.arrival_date) setSejourStart(event.arrival_date.slice(0, 10))
      if (!sejour_end && event.departure_date) setSejourEnd(event.departure_date.slice(0, 10))
    }
  }

  const updateVoyageur = (index: number, field: keyof Voyageur, value: string) => {
    setVoyageurs(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  // Prix par nuit pour chaque type de chambre (supporte tous les noms de colonnes)
  const pricePerNight = useMemo(() => {
    const map: Record<string, number> = {}
    for (const pricing of roomTypes) {
      const rtId = pricing.room_types?.id
      // Try all possible column names for backward compatibility
      const price = pricing.price_per_night ?? pricing.price_per_room ?? pricing.price_per_person
      if (rtId && price != null && price > 0) {
        map[rtId] = price
      }
    }
    return map
  }, [roomTypes])

  // Calculer le prix total pour chaque voyageur et le total global
  const { voyageurPrices, totalPrice } = useMemo(() => {
    const prices: number[] = []
    let total = 0
    for (const v of voyageurs) {
      if (v.room_type_id && v.arrival_date && v.departure_date) {
        const nights = diffDays(v.arrival_date, v.departure_date)
        const nightPrice = pricePerNight[v.room_type_id] || 0
        const vTotal = Math.round(nightPrice * nights * 100) / 100
        prices.push(vTotal)
        total += vTotal
      } else {
        prices.push(0)
      }
    }
    return { voyageurPrices: prices, totalPrice: Math.round(total * 100) / 100 }
  }, [voyageurs, pricePerNight])

  // Détection automatique : besoin d'une nani si bébé ou enfant < 4 ans
  const needsNani = useMemo(() => {
    if (babiesCount > 0) return true
    const today = new Date()
    return voyageurs.some(v => {
      if (v.type !== 'child') return false
      if (!v.date_of_birth) return false
      const dob = new Date(v.date_of_birth)
      const ageMs = today.getTime() - dob.getTime()
      const ageYears = ageMs / (365.25 * 24 * 3600 * 1000)
      return ageYears < 4
    })
  }, [babiesCount, voyageurs])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)

    // Stocker les voyageurs comme JSON dans notes (avec dates et chambre)
    const voyageursData = voyageurs.filter(v => v.first_name || v.last_name)
    const notesContent = voyageursData.length > 0
      ? `__VOYAGEURS_JSON__${JSON.stringify(voyageursData)}__END_VOYAGEURS__`
      : ''
    // Métadonnées séjour séparées
    const sejourMeta = sejour_start || sejour_end
      ? `\n__SEJOUR__${JSON.stringify({ start: sejour_start, end: sejour_end, needs_nani: needsNani })}__END_SEJOUR__`
      : ''

    // Chambre préférée = celle du premier voyageur (pour compatibilité)
    const preferredRoomTypeId = voyageurs[0]?.room_type_id || null

    const data = {
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      phone: formData.get('phone') as string,
      email: (formData.get('email') as string) || null,
      event_id: selectedEvent?.id || null,
      source: formData.get('source') as string,
      status: 'nouveau',
      adults_count: adultsCount,
      children_count: childrenCount,
      babies_count: babiesCount,
      preferred_room_type_id: preferredRoomTypeId,
      notes: notesContent + sejourMeta
        + (needsNani && formData.get('nani_notes') ? `\n[Nani] ${formData.get('nani_notes')}` : '')
        + (formData.get('notes') as string || ''),
    }

    const supabase = createClient()
    const { error: insertError } = await supabase
      .from('leads')
      .insert([data])

    if (insertError) {
      console.error('Error creating lead:', insertError)
      setError('Erreur lors de la création du lead: ' + insertError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard/leads')
    router.refresh()
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric'
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* ÉVÉNEMENT */}
      <div>
        <label htmlFor="event_id" className="block text-sm font-medium text-gray-700 mb-1">
          Événement pressenti *
        </label>
        <select
          id="event_id"
          name="event_id"
          required
          onChange={(e) => handleEventChange(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
        >
          <option value="">-- Sélectionnez un événement --</option>
          {events.map(event => (
            <option key={event.id} value={event.id}>
              {event.name}{event.destination_label ? ` - ${event.destination_label}` : ''}
            </option>
          ))}
        </select>
        {events.length === 0 && (
          <p className="text-sm text-amber-600 mt-1">
            ⚠️ Aucun événement actif. Créez d&apos;abord un événement.
          </p>
        )}
      </div>

      {/* DATES DU SÉJOUR — obligatoires */}
      <div className="bg-turquoise-50 border border-turquoise-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-turquoise-800 mb-3">📅 Dates du séjour *</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-turquoise-700 mb-1">Date d&apos;arrivée *</label>
            <input
              type="date"
              required
              value={sejour_start}
              onChange={(e) => setSejourStart(e.target.value)}
              className="w-full px-3 py-2 border border-turquoise-300 rounded-lg text-sm focus:ring-2 focus:ring-turquoise-500 focus:border-transparent bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-turquoise-700 mb-1">Date de départ *</label>
            <input
              type="date"
              required
              value={sejour_end}
              onChange={(e) => setSejourEnd(e.target.value)}
              min={sejour_start || undefined}
              className="w-full px-3 py-2 border border-turquoise-300 rounded-lg text-sm focus:ring-2 focus:ring-turquoise-500 focus:border-transparent bg-white"
            />
          </div>
        </div>
        {sejour_start && sejour_end && (
          <p className="text-xs text-turquoise-600 mt-2">
            {diffDays(sejour_start, sejour_end)} nuit{diffDays(sejour_start, sejour_end) !== 1 ? 's' : ''}
            {selectedEvent?.nights_count && diffDays(sejour_start, sejour_end) !== selectedEvent.nights_count && (
              <span className="ml-2 text-amber-600">(événement : {selectedEvent.nights_count} nuits)</span>
            )}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="source" className="block text-sm font-medium text-gray-700 mb-1">
          Source *
        </label>
        <select
          id="source"
          name="source"
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
        >
          <option value="manual">✍️ Manuel</option>
          <option value="whatsapp">💬 WhatsApp</option>
          <option value="email">📧 Email</option>
          <option value="phone">📞 Téléphone</option>
          <option value="other">Autre</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
            Prénom *
          </label>
          <input
            type="text"
            id="first_name"
            name="first_name"
            required
            placeholder="Ex: Marie"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
            Nom *
          </label>
          <input
            type="text"
            id="last_name"
            name="last_name"
            required
            placeholder="Ex: Dupont"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Téléphone *
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            required
            placeholder="+33 6 12 34 56 78"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="contact@example.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* VOYAGEURS */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">👥 Voyageurs</h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label htmlFor="adults_count" className="block text-sm font-medium text-gray-700 mb-1">
              Adultes
            </label>
            <input
              type="number"
              id="adults_count"
              name="adults_count"
              min="1"
              value={adultsCount}
              onChange={(e) => setAdultsCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="children_count" className="block text-sm font-medium text-gray-700 mb-1">
              Enfants
            </label>
            <input
              type="number"
              id="children_count"
              name="children_count"
              min="0"
              value={childrenCount}
              onChange={(e) => setChildrenCount(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="babies_count" className="block text-sm font-medium text-gray-700 mb-1">
              Bébés
            </label>
            <input
              type="number"
              id="babies_count"
              name="babies_count"
              min="0"
              value={babiesCount}
              onChange={(e) => setBabiesCount(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Détails de chaque voyageur */}
        <div className="space-y-4">
          {voyageurs.map((v, idx) => {
            const typeLabel = v.type === 'adult' ? '🧑 Adulte' : v.type === 'child' ? '👦 Enfant' : '👶 Bébé'
            const nights = diffDays(v.arrival_date, v.departure_date)
            const ppn = v.room_type_id ? pricePerNight[v.room_type_id] : null

            return (
              <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-500">{typeLabel} {idx + 1}</p>
                  {voyageurPrices[idx] > 0 && (
                    <span className="text-xs font-bold text-turquoise-600 bg-turquoise-50 px-2 py-0.5 rounded">
                      {voyageurPrices[idx]} € ({nights} nuit{nights > 1 ? 's' : ''})
                    </span>
                  )}
                </div>

                {/* Identité */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <input
                    type="text"
                    placeholder="Prénom"
                    value={v.first_name}
                    onChange={(e) => updateVoyageur(idx, 'first_name', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Nom"
                    value={v.last_name}
                    onChange={(e) => updateVoyageur(idx, 'last_name', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
                  />
                  <div>
                    <input
                      type="date"
                      value={v.date_of_birth}
                      onChange={(e) => updateVoyageur(idx, 'date_of_birth', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-400 mt-0.5">Date de naissance</p>
                  </div>
                </div>

                {/* Dates arrivée / départ + chambre */}
                {selectedEvent && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Arrivée</label>
                      <input
                        type="date"
                        value={v.arrival_date}
                        onChange={(e) => updateVoyageur(idx, 'arrival_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Départ</label>
                      <input
                        type="date"
                        value={v.departure_date}
                        onChange={(e) => updateVoyageur(idx, 'departure_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Chambre</label>
                      <select
                        value={v.room_type_id}
                        onChange={(e) => updateVoyageur(idx, 'room_type_id', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
                      >
                        <option value="">-- Chambre --</option>
                        {roomTypes.map((pricing: any) => (
                          <option key={pricing.room_types?.id} value={pricing.room_types?.id}>
                            {pricing.room_types?.name} — {pricePerNight[pricing.room_types?.id] || 0} €/nuit
                          </option>
                        ))}
                      </select>
                      {ppn && nights > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {ppn} € × {nights} nuit{nights > 1 ? 's' : ''} = {voyageurPrices[idx]} €
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* NANI — apparaît automatiquement si bébé ou enfant < 4 ans */}
      {needsNani && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-yellow-800 mb-2">👶 Nani requise</h3>
          <p className="text-xs text-yellow-700 mb-3">
            Un enfant de moins de 4 ans ou un bébé est détecté dans ce groupe. Une nani sera nécessaire pendant le séjour.
          </p>
          <div>
            <label className="block text-xs font-medium text-yellow-700 mb-1">Besoins / précisions nani</label>
            <textarea
              name="nani_notes"
              rows={2}
              placeholder="Ex : nani pour 2 enfants de 1 et 3 ans, disponible à partir de 8h..."
              className="w-full px-3 py-2 border border-yellow-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white"
            />
          </div>
        </div>
      )}

      {/* RÉCAPITULATIF PRIX */}
      {totalPrice > 0 && (
        <div className="bg-turquoise-50 border border-turquoise-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-turquoise-800 mb-2">💰 Récapitulatif tarif</h3>
          <div className="space-y-1 text-sm">
            {voyageurs.map((v, idx) => {
              if (voyageurPrices[idx] <= 0) return null
              const nights = diffDays(v.arrival_date, v.departure_date)
              const roomName = roomTypes.find(r => r.room_types?.id === v.room_type_id)?.room_types?.name || '—'
              return (
                <div key={idx} className="flex justify-between text-gray-700">
                  <span>{v.first_name || `Voyageur ${idx + 1}`} — {roomName} ({nights} nuit{nights > 1 ? 's' : ''})</span>
                  <span className="font-medium">{voyageurPrices[idx]} €</span>
                </div>
              )
            })}
          </div>
          <div className="border-t border-turquoise-200 mt-2 pt-2 flex justify-between">
            <span className="font-bold text-turquoise-800">Total estimé</span>
            <span className="font-bold text-turquoise-800 text-lg">{totalPrice} €</span>
          </div>
        </div>
      )}

      {/* NOTES */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Notes complémentaires..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
        />
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
          {loading ? 'Création...' : 'Créer le lead'}
        </button>
      </div>
    </form>
  )
}
