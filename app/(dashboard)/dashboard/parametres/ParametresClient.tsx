'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Settings, Hotel, Globe, Building, Calendar, Pencil, Check, X, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface ParametresClientProps {
  roomTypes: any[]
  destinations: string[]
  events: any[]
}

export default function ParametresClient({ roomTypes: initialRoomTypes, destinations, events }: ParametresClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [roomTypes, setRoomTypes] = useState(initialRoomTypes)
  const [editingRoom, setEditingRoom] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ name: string; surface_m2: string }>({ name: '', surface_m2: '' })
  const [savingRoom, setSavingRoom] = useState(false)

  const startEdit = (room: any) => {
    setEditingRoom(room.id)
    setEditForm({ name: room.name || '', surface_m2: room.surface_m2 != null ? String(room.surface_m2) : '' })
  }

  const cancelEdit = () => {
    setEditingRoom(null)
  }

  const saveRoom = async (roomId: string) => {
    setSavingRoom(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('room_types')
      .update({
        name: editForm.name,
        surface_m2: editForm.surface_m2 !== '' ? parseInt(editForm.surface_m2, 10) : null,
      })
      .eq('id', roomId)
    if (!error) {
      setRoomTypes(prev => prev.map(r => r.id === roomId ? { ...r, name: editForm.name, surface_m2: editForm.surface_m2 !== '' ? parseInt(editForm.surface_m2, 10) : null } : r))
      setEditingRoom(null)
    }
    setSavingRoom(false)
  }
  const tab = searchParams.get('tab') || 'general'

  const tabs = [
    { id: 'general', label: 'Généraux', icon: Settings },
    { id: 'evenements', label: 'Événements', icon: Calendar }
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">⚙️ Réglages</h1>
        <p className="text-gray-600 mt-1">Configuration de l&apos;application</p>
      </div>

      {/* Onglets */}
      <div className="flex border-b border-gray-200 mb-8">
        {tabs.map((t) => {
          const isActive = tab === t.id
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => router.push(`/dashboard/parametres?tab=${t.id}`)}
              className={`flex items-center px-4 py-3 font-medium border-b-2 transition-colors ${
                isActive
                  ? 'text-turquoise-600 border-turquoise-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Contenu des onglets */}
      {tab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Informations agence */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center">
                <Building className="w-5 h-5 text-turquoise-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Informations agence</h2>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l&apos;agence</label>
                <p className="text-gray-900 bg-gray-50 rounded-lg px-4 py-2">Club Turquoise</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numéro d&apos;immatriculation</label>
                <p className="text-gray-900 bg-gray-50 rounded-lg px-4 py-2">IM075XXXXX</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <p className="text-gray-900 bg-gray-50 rounded-lg px-4 py-2">Paris, France</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="text-gray-900 bg-gray-50 rounded-lg px-4 py-2">contact@clubturquoise.fr</p>
              </div>
            </div>
          </div>

          {/* Types de chambres */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center">
                <Hotel className="w-5 h-5 text-turquoise-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Types de chambres</h2>
              </div>
            </div>
            <div className="p-6">
              {roomTypes && roomTypes.length > 0 ? (
                <div className="space-y-3">
                  {roomTypes.map((room: any) => (
                    <div key={room.id} className="bg-gray-50 rounded-lg px-4 py-3">
                      {editingRoom === room.id ? (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              value={editForm.name}
                              onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                              placeholder="Nom de la chambre"
                              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-turquoise-500"
                            />
                            <input
                              value={editForm.surface_m2}
                              onChange={e => setEditForm(p => ({ ...p, surface_m2: e.target.value }))}
                              placeholder="m²"
                              type="number"
                              min="0"
                              className="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-turquoise-500"
                            />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button onClick={cancelEdit} className="p-1.5 text-gray-400 hover:text-gray-600 rounded">
                              <X className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => saveRoom(room.id)}
                              disabled={savingRoom}
                              className="flex items-center gap-1 px-3 py-1.5 bg-turquoise-600 hover:bg-turquoise-700 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                            >
                              {savingRoom ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              Enregistrer
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{room.name}</p>
                            <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
                              {room.surface_m2 != null && <span>{room.surface_m2} m²</span>}
                              {room.description && <span>{room.description}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-turquoise-600 text-sm">
                              {room.price_per_night
                                ? `${new Intl.NumberFormat('fr-FR').format(room.price_per_night)}€/nuit`
                                : '—'}
                            </p>
                            <button
                              onClick={() => startEdit(room)}
                              className="p-1.5 text-gray-400 hover:text-turquoise-600 hover:bg-turquoise-50 rounded-lg transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Aucun type de chambre configuré</p>
              )}
            </div>
          </div>

          {/* Destinations */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center">
                <Globe className="w-5 h-5 text-turquoise-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Destinations</h2>
              </div>
            </div>
            <div className="p-6">
              {destinations.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {destinations.map((dest, i) => (
                    <span key={i} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-turquoise-100 text-turquoise-800">
                      📍 {dest}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Aucune destination configurée</p>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'evenements' && (
        <div>
          <div className="flex justify-end mb-6">
            <Link
              href="/dashboard/parametres?tab=evenements&action=create"
              className="inline-flex items-center px-4 py-2 bg-turquoise-600 hover:bg-turquoise-700 text-white rounded-lg font-medium transition-colors"
            >
              + Créer un événement
            </Link>
          </div>
          <p className="text-gray-600 mb-6">Gérez les événements et configurez les tarifs par type de chambre.</p>
          
          {events && events.length > 0 ? (
            <div className="space-y-4">
              {events.map((event: any) => (
                <Link
                  key={event.id}
                  href={`/dashboard/evenements/${event.id}`}
                  className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{event.name}</h3>
                        {event.destination_label && (
                          <p className="text-sm text-gray-600 mt-1">📍 {event.destination_label}</p>
                        )}
                        {event.start_date && (
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(event.start_date).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        event.status === 'active' ? 'bg-green-100 text-green-800' :
                        event.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                        event.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {event.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500 mb-4">Aucun événement créé</p>
              <Link
                href="/dashboard/evenements"
                className="text-turquoise-600 hover:text-turquoise-700 font-medium"
              >
                Créer le premier événement →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
