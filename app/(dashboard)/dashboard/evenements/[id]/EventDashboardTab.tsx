'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, RefreshCw } from 'lucide-react'

interface DashboardRow {
  id: string
  primary_contact_first_name: string
  primary_contact_last_name: string
  room_number: string | null
  nanny_name: string | null
  transfer_status: 'pending' | 'confirmed' | 'done'
  flight_date_inbound: string | null
  flight_date_outbound: string | null
  flight_inbound: { flight_number: string; scheduled_time: string; airline: string } | null
  flight_outbound: { flight_number: string; scheduled_time: string; airline: string } | null
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending:   { label: 'En attente', className: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Confirmé',   className: 'bg-blue-100 text-blue-700' },
  done:      { label: 'Fait',       className: 'bg-green-100 text-green-700' },
}

function fmt(time: string) { return time.slice(0, 5) }
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })
}

export function EventDashboardTab({ eventId }: { eventId: string }) {
  const supabase = createClient()
  const [files, setFiles] = useState<DashboardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'arrivals' | 'departures'>('all')
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10))
  const [useDate, setUseDate] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('client_files')
      .select(`
        id, primary_contact_first_name, primary_contact_last_name,
        room_number, nanny_name, transfer_status,
        flight_date_inbound, flight_date_outbound,
        flight_inbound:flight_id_inbound(flight_number, scheduled_time, airline),
        flight_outbound:flight_id_outbound(flight_number, scheduled_time, airline)
      `)
      .eq('event_id', eventId)

    setFiles((data ?? []) as unknown as DashboardRow[])
    setLoading(false)
  }, [eventId, supabase])

  useEffect(() => { load() }, [load])

  const displayed = files.filter(f => {
    if (filter === 'arrivals') {
      if (!f.flight_inbound) return false
      if (useDate && f.flight_date_inbound !== dateFilter) return false
      return true
    }
    if (filter === 'departures') {
      if (!f.flight_outbound) return false
      if (useDate && f.flight_date_outbound !== dateFilter) return false
      return true
    }
    // all
    if (useDate) {
      return f.flight_date_inbound === dateFilter || f.flight_date_outbound === dateFilter
    }
    return true
  }).sort((a, b) => {
    const timeA = filter === 'departures'
      ? (a.flight_outbound?.scheduled_time ?? '99:99')
      : (a.flight_inbound?.scheduled_time ?? '99:99')
    const timeB = filter === 'departures'
      ? (b.flight_outbound?.scheduled_time ?? '99:99')
      : (b.flight_inbound?.scheduled_time ?? '99:99')
    return timeA.localeCompare(timeB)
  })

  const arrivals = files.filter(f => !useDate || f.flight_date_inbound === dateFilter).filter(f => f.flight_inbound).length
  const departures = files.filter(f => !useDate || f.flight_date_outbound === dateFilter).filter(f => f.flight_outbound).length

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-5 h-5 animate-spin text-gray-400 mr-2" />
      <span className="text-gray-500 text-sm">Chargement...</span>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
          {([['all', '📋 Tous'], ['arrivals', '✈️ Arrivées'], ['departures', '🛫 Départs']] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                filter === val ? 'bg-teal-700 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={useDate}
              onChange={e => setUseDate(e.target.checked)}
              className="rounded border-gray-300"
            />
            Filtrer par date
          </label>
          {useDate && (
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-teal-500"
            />
          )}
        </div>

        <button onClick={load} className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700">
          <RefreshCw className="w-3.5 h-3.5" />
          Actualiser
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: useDate ? 'Arrivées du jour' : 'Arrivées totales', value: arrivals, color: 'text-blue-600' },
          { label: useDate ? 'Départs du jour' : 'Départs totaux', value: departures, color: 'text-orange-600' },
          { label: 'Transferts confirmés', value: files.filter(f => f.transfer_status === 'done').length, color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {useDate && (
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500">
            {filter === 'arrivals' ? 'Arrivées' : filter === 'departures' ? 'Départs' : 'Mouvements'} du {fmtDate(dateFilter)}
            {' '}— {displayed.length} client{displayed.length > 1 ? 's' : ''}
          </div>
        )}
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Client</th>
              <th className="text-left px-4 py-3">Vol aller</th>
              <th className="text-left px-4 py-3">Vol retour</th>
              <th className="text-left px-4 py-3">Chambre</th>
              <th className="text-left px-4 py-3">Nanny</th>
              <th className="text-left px-4 py-3">Transfert</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayed.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                  Aucun mouvement{useDate ? ' ce jour' : ''}.
                </td>
              </tr>
            )}
            {displayed.map(f => {
              const st = STATUS_LABELS[f.transfer_status] ?? STATUS_LABELS.pending
              return (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {f.primary_contact_first_name} {f.primary_contact_last_name}
                  </td>
                  <td className="px-4 py-3">
                    {f.flight_inbound ? (
                      <div>
                        <span className="font-mono text-xs font-semibold text-teal-700">{f.flight_inbound.flight_number}</span>
                        <span className="text-gray-400 text-xs ml-1">arr. {fmt(f.flight_inbound.scheduled_time)}</span>
                        {f.flight_date_inbound && (
                          <span className="block text-[10px] text-gray-400">{fmtDate(f.flight_date_inbound)}</span>
                        )}
                      </div>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {f.flight_outbound ? (
                      <div>
                        <span className="font-mono text-xs font-semibold text-orange-600">{f.flight_outbound.flight_number}</span>
                        <span className="text-gray-400 text-xs ml-1">dép. {fmt(f.flight_outbound.scheduled_time)}</span>
                        {f.flight_date_outbound && (
                          <span className="block text-[10px] text-gray-400">{fmtDate(f.flight_date_outbound)}</span>
                        )}
                      </div>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {f.room_number
                      ? <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{f.room_number}</span>
                      : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{f.nanny_name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.className}`}>
                      {st.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
