'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Loader2, Plane, AlertCircle } from 'lucide-react'

interface Flight {
  id: string
  airline: string
  flight_number: string
  flight_type: 'aller' | 'retour'
  origin: string
  destination: string
  scheduled_time: string
  notes: string | null
  is_active: boolean
}

const EMPTY_FORM = {
  airline: '',
  flight_number: '',
  flight_type: 'aller' as 'aller' | 'retour',
  origin: '',
  destination: '',
  scheduled_time: '',
  notes: '',
}

export function FlightsManager({ initialFlights }: { initialFlights: Flight[] }) {
  const [flights, setFlights] = useState<Flight[]>(initialFlights)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [tab, setTab] = useState<'aller' | 'retour'>('aller')

  const supabase = createClient()

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const flightNum = form.flight_number.trim().toUpperCase()

    // Check duplicate client-side
    if (flights.some(f => f.flight_number === flightNum)) {
      setError(`Le numéro de vol ${flightNum} existe déjà dans le référentiel.`)
      return
    }

    setSaving(true)
    const { data, error: dbError } = await supabase
      .from('reference_flights')
      .insert({
        airline: form.airline.trim(),
        flight_number: flightNum,
        flight_type: form.flight_type,
        origin: form.origin.trim().toUpperCase(),
        destination: form.destination.trim().toUpperCase(),
        scheduled_time: form.scheduled_time,
        notes: form.notes.trim() || null,
        is_active: true,
      })
      .select()
      .maybeSingle()

    setSaving(false)

    if (dbError) {
      if (dbError.code === '23505') {
        setError(`Le numéro de vol ${flightNum} existe déjà dans le référentiel.`)
      } else {
        setError(dbError.message)
      }
      return
    }

    if (data) {
      setFlights(prev => [...prev, data as Flight].sort((a, b) =>
        a.flight_type.localeCompare(b.flight_type) || a.airline.localeCompare(b.airline)
      ))
      setForm(EMPTY_FORM)
      setSuccess(true)
      setTab(form.flight_type)
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  const handleDelete = async (id: string, flightNum: string) => {
    if (!confirm(`Supprimer le vol ${flightNum} ?`)) return
    setDeleting(id)
    await supabase.from('reference_flights').delete().eq('id', id)
    setFlights(prev => prev.filter(f => f.id !== id))
    setDeleting(null)
  }

  const displayed = flights.filter(f => f.flight_type === tab)

  return (
    <div className="space-y-6">
      {/* Add form */}
      <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Ajouter un vol</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Compagnie *</label>
            <input
              required
              value={form.airline}
              onChange={e => setForm(p => ({ ...p, airline: e.target.value }))}
              placeholder="Air France"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Numéro de vol * (unique)</label>
            <input
              required
              value={form.flight_number}
              onChange={e => setForm(p => ({ ...p, flight_number: e.target.value.toUpperCase() }))}
              placeholder="AF470"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
            <select
              value={form.flight_type}
              onChange={e => setForm(p => ({ ...p, flight_type: e.target.value as 'aller' | 'retour' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-teal-500"
            >
              <option value="aller">✈️ Aller (vers Maurice)</option>
              <option value="retour">🔙 Retour (depuis Maurice)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Origine (IATA) *</label>
            <input
              required
              value={form.origin}
              onChange={e => setForm(p => ({ ...p, origin: e.target.value.toUpperCase() }))}
              placeholder="CDG"
              maxLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 font-mono uppercase"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Destination (IATA) *</label>
            <input
              required
              value={form.destination}
              onChange={e => setForm(p => ({ ...p, destination: e.target.value.toUpperCase() }))}
              placeholder="MRU"
              maxLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 font-mono uppercase"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {form.flight_type === 'aller' ? 'Heure arrivée *' : 'Heure départ *'}
            </label>
            <input
              required
              type="time"
              value={form.scheduled_time}
              onChange={e => setForm(p => ({ ...p, scheduled_time: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-teal-500"
            />
          </div>
          <div className="col-span-2 md:col-span-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optionnel)</label>
            <input
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Ex: Escale Dubaï, via JNB..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            Vol ajouté avec succès.
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-medium hover:bg-teal-800 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Ajouter le vol
          </button>
        </div>
      </form>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {(['aller', 'retour'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t === 'aller' ? `✈️ Aller (${flights.filter(f => f.flight_type === 'aller').length})` : `🔙 Retour (${flights.filter(f => f.flight_type === 'retour').length})`}
            </button>
          ))}
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Vol</th>
              <th className="text-left px-4 py-3">Compagnie</th>
              <th className="text-left px-4 py-3">Trajet</th>
              <th className="text-left px-4 py-3">{tab === 'aller' ? 'Arrivée' : 'Départ'}</th>
              <th className="text-left px-4 py-3">Notes</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayed.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400 text-sm">
                  <Plane className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Aucun vol {tab}
                </td>
              </tr>
            )}
            {displayed.map(f => (
              <tr key={f.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-semibold text-teal-700">{f.flight_number}</td>
                <td className="px-4 py-3 text-gray-800">{f.airline}</td>
                <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                  {f.origin} → {f.destination}
                </td>
                <td className="px-4 py-3 font-semibold text-gray-900">{f.scheduled_time.slice(0, 5)}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{f.notes || '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(f.id, f.flight_number)}
                    disabled={deleting === f.id}
                    className="p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="Supprimer"
                  >
                    {deleting === f.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
