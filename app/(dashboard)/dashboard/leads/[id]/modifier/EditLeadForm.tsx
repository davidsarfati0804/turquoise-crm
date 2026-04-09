'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface FlightRef { id: string; airline: string; flight_number: string; scheduled_time: string; flight_type: 'aller' | 'retour' }

export function EditLeadForm({ lead }: { lead: any }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [events, setEvents] = useState<any[]>([])
  const [flightsAller, setFlightsAller] = useState<FlightRef[]>([])
  const [flightsRetour, setFlightsRetour] = useState<FlightRef[]>([])

  useEffect(() => {
    const supabase = createClient()
    const loadEvents = async () => {
      const { data } = await supabase
        .from('events')
        .select('id, name, destination_label, start_date')
        .in('status', ['upcoming', 'active', 'draft'])
        .order('start_date', { ascending: false })
      setEvents(data || [])
    }
    const loadFlights = async () => {
      const { data } = await supabase
        .from('reference_flights')
        .select('id, airline, flight_number, scheduled_time, flight_type')
        .eq('is_active', true)
        .order('flight_number')
      setFlightsAller((data ?? []).filter((f: FlightRef) => f.flight_type === 'aller'))
      setFlightsRetour((data ?? []).filter((f: FlightRef) => f.flight_type === 'retour'))
    }
    loadEvents()
    loadFlights()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const data = {
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      phone: formData.get('phone') as string,
      email: (formData.get('email') as string) || null,
      event_id: (formData.get('event_id') as string) || null,
      source: formData.get('source') as string,
      adults_count: parseInt(formData.get('adults_count') as string) || 1,
      children_count: parseInt(formData.get('children_count') as string) || 0,
      babies_count: parseInt(formData.get('babies_count') as string) || 0,
      nounou_included: formData.get('nounou_included') === 'on',
      notes: (formData.get('notes') as string) || null,
      flight_id_inbound: (formData.get('flight_id_inbound') as string) || null,
      flight_id_outbound: (formData.get('flight_id_outbound') as string) || null,
      flight_date_inbound: (formData.get('flight_date_inbound') as string) || null,
      flight_date_outbound: (formData.get('flight_date_outbound') as string) || null,
    }

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('leads')
      .update(data)
      .eq('id', lead.id)

    if (updateError) {
      setError('Erreur: ' + updateError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard/leads')
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
        <label htmlFor="event_id" className="block text-sm font-medium text-gray-700 mb-1">
          Événement pressenti *
        </label>
        <select
          id="event_id"
          name="event_id"
          required
          defaultValue={lead.event_id || ''}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
        >
          <option value="">-- Sélectionnez un événement --</option>
          {events.map(event => (
            <option key={event.id} value={event.id}>
              {event.name}{event.destination_label ? ` - ${event.destination_label}` : ''}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="source" className="block text-sm font-medium text-gray-700 mb-1">
          Source *
        </label>
        <select
          id="source"
          name="source"
          required
          defaultValue={lead.source}
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
            defaultValue={lead.first_name}
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
            defaultValue={lead.last_name}
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
            defaultValue={lead.phone}
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
            defaultValue={lead.email || ''}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Voyageurs</h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label htmlFor="adults_count" className="block text-sm font-medium text-gray-700 mb-1">Adultes</label>
            <input type="number" id="adults_count" name="adults_count" min="1"
              defaultValue={lead.adults_count || 1}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="children_count" className="block text-sm font-medium text-gray-700 mb-1">Enfants</label>
            <input type="number" id="children_count" name="children_count" min="0"
              defaultValue={lead.children_count || 0}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="babies_count" className="block text-sm font-medium text-gray-700 mb-1">Bébés</label>
            <input type="number" id="babies_count" name="babies_count" min="0"
              defaultValue={lead.babies_count || 0}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
            />
          </div>
        </div>
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input type="checkbox" name="nounou_included"
            defaultChecked={!!lead.nounou_included}
            className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
          <span className="text-sm font-medium text-gray-700">
            Nounou privée incluse <span className="text-gray-400 font-normal">(enfants &lt; 4 ans)</span>
          </span>
        </label>
      </div>

      {/* VOLS */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">✈️ Vols <span className="font-normal text-gray-400">(optionnel)</span></h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Vol aller (arrivée MRU)</label>
            <select name="flight_id_inbound" defaultValue={lead.flight_id_inbound || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-turquoise-500 focus:border-transparent">
              <option value="">-- Inconnu pour l&apos;instant --</option>
              {flightsAller.map(f => (
                <option key={f.id} value={f.id}>{f.flight_number} – {f.airline} ({f.scheduled_time.slice(0,5)})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date d&apos;arrivée</label>
            <input type="date" name="flight_date_inbound" defaultValue={lead.flight_date_inbound || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-turquoise-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Vol retour (départ MRU)</label>
            <select name="flight_id_outbound" defaultValue={lead.flight_id_outbound || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-turquoise-500 focus:border-transparent">
              <option value="">-- Inconnu pour l&apos;instant --</option>
              {flightsRetour.map(f => (
                <option key={f.id} value={f.id}>{f.flight_number} – {f.airline} ({f.scheduled_time.slice(0,5)})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date de retour</label>
            <input type="date" name="flight_date_outbound" defaultValue={lead.flight_date_outbound || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-turquoise-500 focus:border-transparent" />
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea id="notes" name="notes" rows={3}
          defaultValue={lead.notes || ''}
          placeholder="Informations complémentaires..."
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
