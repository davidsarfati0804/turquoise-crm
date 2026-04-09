'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Baby, Check, X, ChevronDown } from 'lucide-react'

interface ClientFileRow {
  id: string
  primary_contact_first_name: string
  primary_contact_last_name: string
  babies_count: number
  children_count: number
  nounou_included: boolean
  nanny_name: string | null
}

const NANNIES = [
  'Sarah', 'Amina', 'Priya', 'Mala', 'Divya',
  'Kavita', 'Nisha', 'Asha', 'Rekha', 'Sunita',
]

export function NannyTab({ eventId }: { eventId: string }) {
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
      .select('id, primary_contact_first_name, primary_contact_last_name, babies_count, children_count, nounou_included, nanny_name')
      .eq('event_id', eventId)
      .eq('nounou_included', true)
      .order('primary_contact_last_name')

    setFiles((data ?? []) as ClientFileRow[])
    setLoading(false)
  }, [eventId, supabase])

  useEffect(() => { load() }, [load])

  const save = async (fileId: string) => {
    setSaving(true)
    await supabase.from('client_files')
      .update({ nanny_name: editValue.trim() || null })
      .eq('id', fileId)
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, nanny_name: editValue.trim() || null } : f))
    setSaving(false)
    setEditing(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-5 h-5 animate-spin text-gray-400 mr-2" />
      <span className="text-gray-500 text-sm">Chargement...</span>
    </div>
  )

  const assigned = files.filter(f => f.nanny_name)
  const unassigned = files.filter(f => !f.nanny_name)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-700">
        <Baby className="w-4 h-4 flex-shrink-0" />
        <span>Seuls les dossiers avec la case <strong>Nounou incluse</strong> cochée apparaissent ici.</span>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-teal-500"></span>
          {assigned.length} nanny{assigned.length > 1 ? 's' : ''} assignée{assigned.length > 1 ? 's' : ''}
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
              <th className="text-left px-4 py-3">Bébés / Enfants</th>
              <th className="text-left px-4 py-3">Nanny assignée</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {files.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center py-12 text-gray-400">
                  <Baby className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  Aucun dossier avec service nounou pour cet événement.
                </td>
              </tr>
            )}
            {/* Unassigned first */}
            {[...unassigned, ...assigned].map(f => (
              <tr key={f.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {f.primary_contact_first_name} {f.primary_contact_last_name}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {f.babies_count > 0 && <span className="mr-2">{f.babies_count} bébé{f.babies_count > 1 ? 's' : ''}</span>}
                  {f.children_count > 0 && <span>{f.children_count} enfant{f.children_count > 1 ? 's' : ''}</span>}
                </td>
                <td className="px-4 py-3">
                  {editing === f.id ? (
                    <div className="flex items-center gap-1">
                      <div className="relative">
                        <input
                          autoFocus
                          list={`nannies-${f.id}`}
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') save(f.id)
                            if (e.key === 'Escape') setEditing(null)
                          }}
                          placeholder="Nom de la nanny..."
                          className="text-sm border border-gray-300 rounded px-2 py-1 outline-none focus:border-teal-500 pr-6"
                        />
                        <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        <datalist id={`nannies-${f.id}`}>
                          {NANNIES.map(n => <option key={n} value={n} />)}
                        </datalist>
                      </div>
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
                      onClick={() => { setEditing(f.id); setEditValue(f.nanny_name || '') }}
                      className={`text-sm px-3 py-1 rounded border transition-colors ${
                        f.nanny_name
                          ? 'border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100'
                          : 'border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {f.nanny_name || 'Assigner une nanny...'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
