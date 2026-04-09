'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from '@dnd-kit/core'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import {
  Plus, Trash2, Loader2, GripVertical, X, Shield, Copy,
  Users, Baby, PersonStanding,
} from 'lucide-react'
import { format, subDays } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientFileRow {
  id: string
  primary_contact_first_name: string
  primary_contact_last_name: string
  room_number: string | null
  adults_count: number
  children_count: number
  babies_count: number
  flight_date_inbound: string | null
  flight_date_outbound: string | null
}

interface SeatingTable {
  id: string
  name: string
  table_type: 'normal' | 'safety'
  tab_type: 'jour' | 'chabbat'
  display_order: number
}

interface Assignment {
  id: string
  table_id: string
  client_file_id: string
  assigned_date: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function today(): string { return new Date().toISOString().slice(0, 10) }
function yesterday(): string { return subDays(new Date(), 1).toISOString().slice(0, 10) }

function totalCouverts(f: ClientFileRow) {
  return (f.adults_count || 0) + (f.children_count || 0) + (f.babies_count || 0)
}

function PaxBadges({ f, size = 'sm' }: { f: ClientFileRow; size?: 'sm' | 'xs' }) {
  const s = size === 'xs' ? 'text-[10px] px-1 py-0.5' : 'text-xs px-1.5 py-0.5'
  return (
    <div className="flex gap-1 flex-wrap">
      {f.adults_count > 0 && (
        <span className={`${s} rounded font-semibold bg-blue-100 text-blue-700`}>{f.adults_count} ADL</span>
      )}
      {f.children_count > 0 && (
        <span className={`${s} rounded font-semibold bg-amber-100 text-amber-700`}>{f.children_count} ENF</span>
      )}
      {f.babies_count > 0 && (
        <span className={`${s} rounded font-semibold bg-pink-100 text-pink-700`}>{f.babies_count} BABY</span>
      )}
    </div>
  )
}

// ─── DraggableFamily ──────────────────────────────────────────────────────────

function DraggableFamily({
  file, isArrival, isDeparture, isPlaced, compact = false,
}: {
  file: ClientFileRow
  isArrival: boolean
  isDeparture: boolean
  isPlaced: boolean
  compact?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: file.id,
    disabled: isPlaced,
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  const borderColor = isArrival ? 'border-l-4 border-l-green-400' : isDeparture ? 'border-l-4 border-l-red-400' : ''

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`
        bg-white rounded-lg border border-gray-200 p-3 select-none
        ${isDragging ? 'opacity-50 shadow-xl z-50' : ''}
        ${isPlaced ? 'opacity-40 cursor-default' : 'cursor-grab active:cursor-grabbing hover:border-teal-300 hover:shadow-sm'}
        ${isDeparture && !isPlaced ? 'opacity-70' : ''}
        ${borderColor}
        ${compact ? 'p-2' : ''}
      `}
    >
      <div className="flex items-start gap-2">
        {!isPlaced && (
          <div {...listeners} className="mt-0.5 text-gray-300 hover:text-gray-500 cursor-grab flex-shrink-0">
            <GripVertical className="w-4 h-4" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`font-medium text-gray-900 ${compact ? 'text-xs' : 'text-sm'} truncate`}>
              {file.primary_contact_first_name} {file.primary_contact_last_name}
            </span>
            {file.room_number && (
              <span className="font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">
                Ch. {file.room_number}
              </span>
            )}
            {isArrival && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Arrivée</span>}
            {isDeparture && <span className="text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Départ</span>}
          </div>
          <div className="mt-1">
            <PaxBadges f={file} size={compact ? 'xs' : 'sm'} />
          </div>
        </div>
        <span className="text-xs font-bold text-gray-400 flex-shrink-0">{totalCouverts(file)}</span>
      </div>
    </div>
  )
}

// ─── TableCard ────────────────────────────────────────────────────────────────

function TableCard({
  table, families, onRemoveFamily, onDeleteTable, onRenameTable, dateStr,
}: {
  table: SeatingTable
  families: ClientFileRow[]
  onRemoveFamily: (fileId: string) => void
  onDeleteTable: (tableId: string) => void
  onRenameTable: (tableId: string, name: string) => void
  dateStr: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id: table.id })
  const [editing, setEditing] = useState(false)
  const [nameVal, setNameVal] = useState(table.name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setNameVal(table.name) }, [table.name])
  useEffect(() => { if (editing) inputRef.current?.select() }, [editing])

  const totalADL = families.reduce((s, f) => s + (f.adults_count || 0), 0)
  const totalENF = families.reduce((s, f) => s + (f.children_count || 0), 0)
  const totalBABY = families.reduce((s, f) => s + (f.babies_count || 0), 0)
  const total = totalADL + totalENF + totalBABY

  const isSafety = table.table_type === 'safety'

  return (
    <div
      className={`rounded-xl border-2 flex flex-col min-h-[180px] transition-colors ${
        isOver ? 'border-teal-400 bg-teal-50/30' : isSafety ? 'border-purple-200 bg-purple-50/30' : 'border-gray-200 bg-white'
      }`}
    >
      {/* Header */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-t-xl border-b ${isSafety ? 'border-purple-200 bg-purple-50' : 'border-gray-100 bg-gray-50'}`}>
        {editing ? (
          <input
            ref={inputRef}
            value={nameVal}
            onChange={e => setNameVal(e.target.value)}
            onBlur={() => { onRenameTable(table.id, nameVal); setEditing(false) }}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === 'Escape') { onRenameTable(table.id, nameVal); setEditing(false) }
            }}
            className="flex-1 text-sm font-semibold bg-transparent border-b border-teal-400 outline-none"
          />
        ) : (
          <button
            className="flex-1 text-sm font-semibold text-left text-gray-800 hover:text-teal-700 truncate"
            onClick={() => setEditing(true)}
          >
            {table.name}
          </button>
        )}
        {isSafety && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">
            <Shield className="w-3 h-3" />Safety
          </span>
        )}
        {total > 0 && (
          <span className="text-xs font-bold text-gray-500 bg-white border border-gray-200 px-1.5 py-0.5 rounded">
            {totalADL}+{totalENF}+{totalBABY}={total}
          </span>
        )}
        <button
          onClick={() => onDeleteTable(table.id)}
          className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Drop zone */}
      <div ref={setNodeRef} className="flex-1 p-2 flex flex-col gap-1.5 min-h-[120px]">
        {families.length === 0 && (
          <div className={`flex-1 flex items-center justify-center rounded-lg border-2 border-dashed text-xs text-gray-300 min-h-[80px] ${
            isOver ? 'border-teal-300 text-teal-400' : 'border-gray-200'
          }`}>
            {isOver ? 'Déposer ici' : 'Glisser une famille'}
          </div>
        )}
        {families.map(f => {
          const isArr = f.flight_date_inbound === dateStr
          const isDep = f.flight_date_outbound === dateStr
          return (
            <div key={f.id} className={`relative group rounded-lg border ${
              isArr ? 'border-l-4 border-l-green-400 border-gray-200' :
              isDep ? 'border-l-4 border-l-red-400 border-gray-200 opacity-80' : 'border-gray-200'
            } bg-white p-2`}>
              <div className="flex items-start gap-1.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-xs font-medium text-gray-900 truncate">
                      {f.primary_contact_first_name} {f.primary_contact_last_name}
                    </span>
                    {f.room_number && (
                      <span className="font-mono text-[10px] bg-gray-100 px-1 py-0.5 rounded text-gray-400">
                        {f.room_number}
                      </span>
                    )}
                    {isArr && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1 py-0.5 rounded">Arrivée</span>}
                    {isDep && <span className="text-[10px] font-bold bg-red-100 text-red-700 px-1 py-0.5 rounded">Départ</span>}
                  </div>
                  <PaxBadges f={f} size="xs" />
                </div>
                <button
                  onClick={() => onRemoveFamily(f.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-300 hover:text-red-500 flex-shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SeatingTab({ eventId }: { eventId: string }) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'jour' | 'chabbat'>('jour')
  const [files, setFiles] = useState<ClientFileRow[]>([])
  const [tables, setTables] = useState<SeatingTable[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dragActive, setDragActive] = useState<ClientFileRow | null>(null)
  const [dateStr] = useState(today)
  const [copyingYesterday, setCopyingYesterday] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const load = useCallback(async () => {
    setLoading(true)
    const [filesRes, tablesRes, assignRes] = await Promise.all([
      supabase.from('client_files')
        .select('id, primary_contact_first_name, primary_contact_last_name, room_number, adults_count, children_count, babies_count, flight_date_inbound, flight_date_outbound')
        .eq('event_id', eventId),
      supabase.from('event_seating_tables')
        .select('*')
        .eq('event_id', eventId)
        .order('display_order'),
      supabase.from('event_seating_assignments')
        .select('*')
        .eq('assigned_date', dateStr),
    ])
    setFiles(filesRes.data ?? [])
    setTables(tablesRes.data ?? [])
    setAssignments(assignRes.data ?? [])
    setLoading(false)
  }, [eventId, dateStr, supabase])

  useEffect(() => { load() }, [load])

  // Derived
  const tabTables = tables.filter(t => t.tab_type === activeTab)
  const assignedFileIds = new Set(
    assignments
      .filter(a => tabTables.some(t => t.id === a.table_id))
      .map(a => a.client_file_id)
  )

  function getTableFamilies(tableId: string): ClientFileRow[] {
    const fileIds = assignments.filter(a => a.table_id === tableId).map(a => a.client_file_id)
    return fileIds.map(id => files.find(f => f.id === id)).filter(Boolean) as ClientFileRow[]
  }

  // ── DnD handlers ──

  function handleDragStart(e: DragStartEvent) {
    const f = files.find(f => f.id === e.active.id)
    setDragActive(f ?? null)
  }

  function handleDragOver(_e: DragOverEvent) {}

  async function handleDragEnd(e: DragEndEvent) {
    setDragActive(null)
    const fileId = e.active.id as string
    const tableId = e.over?.id as string | undefined
    if (!tableId) return
    const table = tabTables.find(t => t.id === tableId)
    if (!table) return
    // Already assigned to this table?
    if (assignments.some(a => a.table_id === tableId && a.client_file_id === fileId && a.assigned_date === dateStr)) return

    setSaving(true)
    // Remove from any other table in this tab
    const existing = assignments.find(a =>
      a.client_file_id === fileId &&
      a.assigned_date === dateStr &&
      tabTables.some(t => t.id === a.table_id)
    )
    if (existing) {
      await supabase.from('event_seating_assignments').delete().eq('id', existing.id)
    }
    const { data } = await supabase.from('event_seating_assignments')
      .insert({ table_id: tableId, client_file_id: fileId, assigned_date: dateStr })
      .select().maybeSingle()
    if (data) {
      setAssignments(prev => [
        ...prev.filter(a => !(a.client_file_id === fileId && a.assigned_date === dateStr && tabTables.some(t => t.id === a.table_id))),
        data as Assignment,
      ])
    }
    setSaving(false)
  }

  // ── Table CRUD ──

  async function addTable(type: 'normal' | 'safety') {
    const existing = tables.filter(t => t.tab_type === activeTab)
    const num = existing.length + 1
    const name = type === 'safety' ? 'Table Safety' : `Table ${num}`
    setSaving(true)
    const { data } = await supabase.from('event_seating_tables')
      .insert({ event_id: eventId, name, table_type: type, tab_type: activeTab, display_order: num })
      .select().maybeSingle()
    if (data) setTables(prev => [...prev, data as SeatingTable])
    setSaving(false)
  }

  async function deleteTable(tableId: string) {
    if (!confirm('Supprimer cette table et ses placements ?')) return
    await supabase.from('event_seating_assignments').delete().eq('table_id', tableId)
    await supabase.from('event_seating_tables').delete().eq('id', tableId)
    setTables(prev => prev.filter(t => t.id !== tableId))
    setAssignments(prev => prev.filter(a => a.table_id !== tableId))
  }

  async function renameTable(tableId: string, name: string) {
    if (!name.trim()) return
    await supabase.from('event_seating_tables').update({ name: name.trim() }).eq('id', tableId)
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, name: name.trim() } : t))
  }

  async function removeFamily(fileId: string) {
    const a = assignments.find(a =>
      a.client_file_id === fileId &&
      a.assigned_date === dateStr &&
      tabTables.some(t => t.id === a.table_id)
    )
    if (!a) return
    await supabase.from('event_seating_assignments').delete().eq('id', a.id)
    setAssignments(prev => prev.filter(p => p.id !== a.id))
  }

  // ── Copier d'hier ──

  async function copyYesterday() {
    if (!confirm('Copier le plan de table d\'hier ? Les placements du jour seront remplacés.')) return
    setCopyingYesterday(true)
    const yest = yesterday()

    // Get yesterday's assignments for this tab's tables
    const { data: yesterdayAssignments } = await supabase
      .from('event_seating_assignments')
      .select('*, event_seating_tables!inner(tab_type, event_id)')
      .eq('assigned_date', yest)
      .eq('event_seating_tables.event_id', eventId)
      .eq('event_seating_tables.tab_type', activeTab)

    if (!yesterdayAssignments?.length) {
      alert('Aucun plan de table trouvé pour hier.')
      setCopyingYesterday(false)
      return
    }

    // Delete today's assignments for this tab
    const todayTabAssignmentIds = assignments
      .filter(a => tabTables.some(t => t.id === a.table_id))
      .map(a => a.id)

    if (todayTabAssignmentIds.length > 0) {
      await supabase.from('event_seating_assignments').delete().in('id', todayTabAssignmentIds)
    }

    // Re-insert with today's date
    const toInsert = yesterdayAssignments.map((a: Record<string, unknown>) => ({
      table_id: a.table_id,
      client_file_id: a.client_file_id,
      assigned_date: dateStr,
    }))

    const { data: inserted } = await supabase
      .from('event_seating_assignments')
      .insert(toInsert)
      .select()

    setAssignments(prev => [
      ...prev.filter(a => !tabTables.some(t => t.id === a.table_id)),
      ...(inserted ?? []) as Assignment[],
    ])

    setCopyingYesterday(false)
  }

  // ── Global stats ──
  const totalADL  = files.reduce((s, f) => s + (f.adults_count || 0), 0)
  const totalENF  = files.reduce((s, f) => s + (f.children_count || 0), 0)
  const totalBABY = files.reduce((s, f) => s + (f.babies_count || 0), 0)
  const totalAll  = totalADL + totalENF + totalBABY

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-5 h-5 animate-spin text-gray-400 mr-2" />
      <span className="text-gray-500 text-sm">Chargement...</span>
    </div>
  )

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 h-[calc(100vh-240px)] min-h-[600px]">

        {/* ── Sidebar familles ── */}
        <div className="w-64 flex-shrink-0 flex flex-col bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-gray-200 bg-white">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Familles</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{files.length} dossiers · {totalAll} couverts</p>
          </div>
          {/* Stats bar */}
          <div className="flex gap-1 px-3 py-1.5 bg-white border-b border-gray-100">
            <span className="flex items-center gap-1 text-[11px] text-blue-600 font-semibold">
              <PersonStanding className="w-3 h-3" />{totalADL}
            </span>
            <span className="text-gray-300">·</span>
            <span className="flex items-center gap-1 text-[11px] text-amber-600 font-semibold">
              <Users className="w-3 h-3" />{totalENF}
            </span>
            <span className="text-gray-300">·</span>
            <span className="flex items-center gap-1 text-[11px] text-pink-600 font-semibold">
              <Baby className="w-3 h-3" />{totalBABY}
            </span>
            <span className="ml-auto text-[11px] font-bold text-gray-700">{totalAll} tot.</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {files.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-8">Aucun dossier</p>
            )}
            {files.map(f => {
              const isPlaced = assignedFileIds.has(f.id)
              const isArr = f.flight_date_inbound === dateStr
              const isDep = f.flight_date_outbound === dateStr
              return (
                <DraggableFamily
                  key={f.id}
                  file={f}
                  isArrival={isArr}
                  isDeparture={isDep}
                  isPlaced={isPlaced}
                />
              )
            })}
          </div>
        </div>

        {/* ── Main zone ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Sub-tabs + actions */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              {(['jour', 'chabbat'] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === t ? 'bg-teal-700 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}>
                  {t === 'jour' ? '🍽️ Table du jour' : '✡️ Table de Chabbat'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => addTable('normal')} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 bg-teal-700 text-white rounded-lg text-sm font-medium hover:bg-teal-800 disabled:opacity-50">
                <Plus className="w-4 h-4" />Table
              </button>
              <button onClick={() => addTable('safety')} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
                <Shield className="w-4 h-4" />Table Safety
              </button>
              {activeTab === 'jour' && (
                <button onClick={copyYesterday} disabled={copyingYesterday || saving}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
                  {copyingYesterday ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                  Copier d&apos;hier
                </button>
              )}
            </div>

            {saving && <span className="text-xs text-gray-400 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />Sauvegarde...
            </span>}

            <div className="ml-auto text-xs text-gray-400">
              {format(new Date(dateStr), 'EEEE d MMMM yyyy', { locale: fr })}
            </div>
          </div>

          {/* Tables grid */}
          <div className="flex-1 overflow-y-auto">
            {tabTables.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <p className="text-sm mb-3">Aucune table pour l&apos;instant</p>
                <button onClick={() => addTable('normal')}
                  className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-xl text-sm hover:border-teal-400 hover:text-teal-600 transition-colors">
                  <Plus className="w-4 h-4" />Ajouter une table
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
                {tabTables.map(table => (
                  <TableCard
                    key={table.id}
                    table={table}
                    families={getTableFamilies(table.id)}
                    onRemoveFamily={removeFamily}
                    onDeleteTable={deleteTable}
                    onRenameTable={renameTable}
                    dateStr={dateStr}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {dragActive && (
          <div className="bg-white rounded-lg border-2 border-teal-400 shadow-2xl p-3 w-56 opacity-90">
            <p className="text-sm font-medium text-gray-900">
              {dragActive.primary_contact_first_name} {dragActive.primary_contact_last_name}
            </p>
            <PaxBadges f={dragActive} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
