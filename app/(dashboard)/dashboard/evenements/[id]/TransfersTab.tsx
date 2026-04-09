'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Plane, ChevronDown, ChevronRight, Edit2, Check, X } from 'lucide-react'

interface Flight {
  id: string
  airline: string
  flight_number: string
  flight_type: 'aller' | 'retour'
  origin: string
  destination: string
  scheduled_time: string
}

interface FileWithFlight {
  id: string
  primary_contact_first_name: string
  primary_contact_last_name: string
  adults_count: number
  children_count: number
  babies_count: number
  room_number: string | null
  transfer_notes: string | null
  transfer_status: 'pending' | 'confirmed' | 'done'
  flight_date_inbound: string | null
  flight_date_outbound: string | null
  flight_inbound: Flight | null
  flight_outbound: Flight | null
}

interface GroupedByFlight {
  flight: Flight
  date: string | null
  files: FileWithFlight[]
}

function totalPax(f: FileWithFlight) {
  return (f.adults_count || 1) + (f.children_count || 0) + (f.babies_count || 0)
}

function paxLabel(f: FileWithFlight) {
  const parts = [`${f.adults_count || 1} ad.`]
  if (f.children_count) parts.push(`${f.children_count} enf.`)
  if (f.babies_count) parts.push(`${f.babies_count} bb.`)
  return parts.join(' ')
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending:   { label: 'En attente', className: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Confirmé',   className: 'bg-blue-100 text-blue-700' },
  done:      { label: 'Fait',       className: 'bg-green-100 text-green-700' },
}

export function TransfersTab({ eventId }: { eventId: string }) {
  const supabase = createClient()
  const [files, setFiles] = useState<FileWithFlight[]>([])
  const [flights, setFlights] = useState<Flight[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'aller' | 'retour'>('aller')
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [notesValue, setNotesValue] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    const [filesRes, flightsRes] = await Promise.all([
      supabase
        .from('client_files')
        .select(`
          id, primary_contact_first_name, primary_contact_last_name,
          adults_count, children_count, babies_count, room_number,
          transfer_notes, transfer_status,
          flight_date_inbound, flight_date_outbound,
          flight_inbound:flight_id_inbound(id, airline, flight_number, flight_type, origin, destination, scheduled_time),
          flight_outbound:flight_id_outbound(id, airline, flight_number, flight_type, origin, destination, scheduled_time)
        `)
        .eq('event_id', eventId),
      supabase
        .from('reference_flights')
        .select('*')
        .eq('is_active', true)
        .order('flight_type').order('flight_number'),
    ])

    setFiles((filesRes.data ?? []) as unknown as FileWithFlight[])
    setFlights(flightsRes.data ?? [])
    setLoading(false)
  }, [eventId, supabase])

  useEffect(() => { load() }, [load])

  const updateStatus = async (fileId: string, status: string) => {
    await supabase.from('client_files').update({ transfer_status: status }).eq('id', fileId)
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, transfer_status: status as 'pending' | 'confirmed' | 'done' } : f))
  }

  const saveNotes = async (fileId: string) => {
    setSavingNotes(true)
    await supabase.from('client_files').update({ transfer_notes: notesValue || null }).eq('id', fileId)
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, transfer_notes: notesValue || null } : f))
    setSavingNotes(false)
    setEditingNotes(null)
  }

  // Assign flight to a client file
  const assignFlight = async (fileId: string, flightId: string | null, type: 'inbound' | 'outbound') => {
    const field = type === 'inbound' ? 'flight_id_inbound' : 'flight_id_outbound'
    await supabase.from('client_files').update({ [field]: flightId }).eq('id', fileId)
    load()
  }

  // Group files by flight for the current tab
  const relevantFiles = files.filter(f =>
    tab === 'aller' ? f.flight_inbound : f.flight_outbound
  )
  const noFlightFiles = files.filter(f =>
    tab === 'aller' ? !f.flight_inbound : !f.flight_outbound
  )

  // Group by flight + date
  const groups: GroupedByFlight[] = []
  const seen = new Map<string, GroupedByFlight>()
  for (const f of relevantFiles) {
    const flight = (tab === 'aller' ? f.flight_inbound : f.flight_outbound)!
    const date = tab === 'aller' ? f.flight_date_inbound : f.flight_date_outbound
    const key = flight.id + '|' + (date ?? 'none')
    if (!seen.has(key)) {
      const g: GroupedByFlight = { flight, date, files: [] }
      seen.set(key, g)
      groups.push(g)
    }
    seen.get(key)!.files.push(f)
  }
  groups.sort((a, b) => {
    if (a.date && b.date) return a.date.localeCompare(b.date)
    if (a.date) return -1
    if (b.date) return 1
    return a.flight.flight_number.localeCompare(b.flight.flight_number)
  })

  const flightOptions = flights.filter(f =>
    tab === 'aller' ? f.flight_type === 'aller' : f.flight_type === 'retour'
  )

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-5 h-5 animate-spin text-gray-400 mr-2" />
      <span className="text-gray-500 text-sm">Chargement...</span>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Tab aller/retour */}
      <div className="flex border border-gray-200 rounded-lg overflow-hidden w-fit">
        {(['aller', 'retour'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm font-medium transition-colors ${
              tab === t ? 'bg-teal-700 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t === 'aller' ? '✈️ Arrivées' : '🛫 Départs'}
          </button>
        ))}
      </div>

      {/* Groups */}
      {groups.length === 0 && noFlightFiles.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm">
          <Plane className="w-10 h-10 mx-auto mb-2 opacity-20" />
          Aucun dossier avec vol {tab} assigné.
        </div>
      )}

      {groups.map(g => {
        const key = g.flight.id + '|' + (g.date ?? 'none')
        const isCollapsed = collapsed.has(key)
        const totalPaxGroup = g.files.reduce((s, f) => s + totalPax(f), 0)

        return (
          <div key={key} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Flight header */}
            <button
              onClick={() => setCollapsed(prev => {
                const n = new Set(prev)
                n.has(key) ? n.delete(key) : n.add(key)
                return n
              })}
              className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              <Plane className="w-4 h-4 text-teal-600 flex-shrink-0" />
              <span className="font-mono font-bold text-teal-700">{g.flight.flight_number}</span>
              <span className="text-gray-600 text-sm">{g.flight.airline}</span>
              <span className="text-gray-400 text-sm font-mono">{g.flight.origin} → {g.flight.destination}</span>
              <span className="font-semibold text-gray-900">{g.flight.scheduled_time.slice(0, 5)}</span>
              {g.date && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  {new Date(g.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                </span>
              )}
              <span className="ml-auto text-xs text-gray-400">{g.files.length} client{g.files.length > 1 ? 's' : ''} · {totalPaxGroup} PAX</span>
            </button>

            {!isCollapsed && (
              <table className="w-full text-sm">
                <thead className="bg-gray-50/50 text-xs font-semibold text-gray-400 uppercase tracking-wide border-t border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-2">Client</th>
                    <th className="text-left px-4 py-2">PAX</th>
                    <th className="text-left px-4 py-2">Chambre</th>
                    <th className="text-left px-4 py-2">Notes transfert</th>
                    <th className="text-left px-4 py-2">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {g.files.map(f => {
                    const st = STATUS_LABELS[f.transfer_status] ?? STATUS_LABELS.pending
                    return (
                      <tr key={f.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2.5 font-medium text-gray-900">
                          {f.primary_contact_first_name} {f.primary_contact_last_name}
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{paxLabel(f)}</td>
                        <td className="px-4 py-2.5">
                          {f.room_number
                            ? <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{f.room_number}</span>
                            : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          {editingNotes === f.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                autoFocus
                                value={notesValue}
                                onChange={e => setNotesValue(e.target.value)}
                                className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:border-teal-500"
                                placeholder="Notes de transfert..."
                              />
                              <button onClick={() => saveNotes(f.id)} disabled={savingNotes}
                                className="p-1 rounded bg-teal-600 text-white">
                                {savingNotes ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                              </button>
                              <button onClick={() => setEditingNotes(null)}
                                className="p-1 rounded bg-gray-200 text-gray-500">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingNotes(f.id); setNotesValue(f.transfer_notes || '') }}
                              className="flex items-center gap-1 group text-xs text-left"
                            >
                              <span className={f.transfer_notes ? 'text-gray-700' : 'text-gray-300 italic'}>
                                {f.transfer_notes || 'Ajouter une note...'}
                              </span>
                              <Edit2 className="w-3 h-3 text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <select
                            value={f.transfer_status}
                            onChange={e => updateStatus(f.id, e.target.value)}
                            className={`text-xs font-semibold px-2 py-1 rounded-full border-0 outline-none cursor-pointer ${st.className}`}
                          >
                            <option value="pending">En attente</option>
                            <option value="confirmed">Confirmé</option>
                            <option value="done">Fait</option>
                          </select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )
      })}

      {/* Clients sans vol assigné */}
      {noFlightFiles.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-200">
            <p className="text-sm font-medium text-amber-800">
              ⚠️ {noFlightFiles.length} dossier{noFlightFiles.length > 1 ? 's' : ''} sans vol {tab} assigné
            </p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2">Client</th>
                <th className="text-left px-4 py-2">PAX</th>
                <th className="text-left px-4 py-2">Assigner vol {tab}</th>
                <th className="text-left px-4 py-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {noFlightFiles.map(f => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900">
                    {f.primary_contact_first_name} {f.primary_contact_last_name}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{paxLabel(f)}</td>
                  <td className="px-4 py-2.5">
                    <select
                      defaultValue=""
                      onChange={e => assignFlight(f.id, e.target.value || null, tab === 'aller' ? 'inbound' : 'outbound')}
                      className="text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:border-teal-500"
                    >
                      <option value="">Choisir un vol...</option>
                      {flightOptions.map(fl => (
                        <option key={fl.id} value={fl.id}>
                          {fl.flight_number} – {fl.airline} ({fl.scheduled_time.slice(0, 5)})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="date"
                      defaultValue={tab === 'aller' ? (f.flight_date_inbound ?? '') : (f.flight_date_outbound ?? '')}
                      onChange={async e => {
                        const field = tab === 'aller' ? 'flight_date_inbound' : 'flight_date_outbound'
                        await supabase.from('client_files').update({ [field]: e.target.value || null }).eq('id', f.id)
                      }}
                      className="text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:border-teal-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
