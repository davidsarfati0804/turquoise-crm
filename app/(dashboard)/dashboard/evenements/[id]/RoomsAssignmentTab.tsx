'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, BedDouble, Check, X } from 'lucide-react'

interface ClientFileRow {
  id: string
  primary_contact_first_name: string
  primary_contact_last_name: string
  adults_count: number
  children_count: number
  babies_count: number
  room_number: string | null
  selected_room_type: { name: string } | null
}

export function RoomsAssignmentTab({ eventId }: { eventId: string }) {
  const supabase = createClient()
  const [files, setFiles] = useState<ClientFileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('client_files')
      .select(`
        id, primary_contact_first_name, primary_contact_last_name,
        adults_count, children_count, babies_count, room_number,
        selected_room_type:selected_room_type_id(name)
      `)
      .eq('event_id', eventId)
      .order('primary_contact_last_name')

    setFiles((data ?? []) as unknown as ClientFileRow[])
    setLoading(false)
  }, [eventId, supabase])

  useEffect(() => { load() }, [load])

  const save = async (fileId: string) => {
    setSaving(true)
    await supabase.from('client_files')
      .update({ room_number: editValue.trim() || null })
      .eq('id', fileId)
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, room_number: editValue.trim() || null } : f))
    setSaving(false)
    setEditing(null)
  }

  const assigned = files.filter(f => f.room_number)
  const unassigned = files.filter(f => !f.room_number)

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-5 h-5 animate-spin text-gray-400 mr-2" />
      <span className="text-gray-500 text-sm">Chargement...</span>
    </div>
  )

  const Row = ({ f }: { f: ClientFileRow }) => {
    const pax = (f.adults_count || 1) + (f.children_count || 0) + (f.babies_count || 0)
    return (
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-3 font-medium text-gray-900">
          {f.primary_contact_first_name} {f.primary_contact_last_name}
        </td>
        <td className="px-4 py-3 text-gray-500 text-xs">
          {f.adults_count || 1} ad.{f.children_count ? ` ${f.children_count} enf.` : ''}{f.babies_count ? ` ${f.babies_count} bb.` : ''}
          &nbsp;({pax} PAX)
        </td>
        <td className="px-4 py-3 text-gray-500 text-xs">
          {f.selected_room_type?.name || '—'}
        </td>
        <td className="px-4 py-3">
          {editing === f.id ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') save(f.id)
                  if (e.key === 'Escape') setEditing(null)
                }}
                placeholder="Ex: 204"
                className="w-20 text-sm border border-gray-300 rounded px-2 py-1 outline-none focus:border-teal-500 font-mono text-center"
              />
              <button onClick={() => save(f.id)} disabled={saving}
                className="p-1 rounded bg-teal-600 text-white">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              </button>
              <button onClick={() => setEditing(null)}
                className="p-1 rounded bg-gray-200 text-gray-500">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setEditing(f.id); setEditValue(f.room_number || '') }}
              className={`font-mono text-sm px-3 py-1 rounded border transition-colors ${
                f.room_number
                  ? 'border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100'
                  : 'border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600'
              }`}
            >
              {f.room_number || 'Attribuer...'}
            </button>
          )}
        </td>
      </tr>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-teal-500"></span>
          {assigned.length} chambre{assigned.length > 1 ? 's' : ''} attribuée{assigned.length > 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          {unassigned.length} en attente
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Client</th>
              <th className="text-left px-4 py-3">Composition</th>
              <th className="text-left px-4 py-3">Type chambre</th>
              <th className="text-left px-4 py-3">N° Chambre</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {files.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-12 text-gray-400">
                  <BedDouble className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  Aucun dossier pour cet événement.
                </td>
              </tr>
            )}
            {/* Unassigned first */}
            {unassigned.map(f => <Row key={f.id} f={f} />)}
            {/* Then assigned */}
            {assigned.map(f => <Row key={f.id} f={f} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}
