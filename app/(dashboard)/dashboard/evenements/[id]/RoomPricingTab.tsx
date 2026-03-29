'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { detectPriceColumnName, upsertPricing } from '@/lib/supabase/pricing-utils'
import { Plus, Save, Trash2 } from 'lucide-react'

export function RoomPricingTab({ event }: { event: any }) {
  const [roomTypes, setRoomTypes] = useState<any[]>([])
  const [pricing, setPricing] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)


  const loadData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    // Charger les types de chambre
    const { data: roomTypesData } = await supabase
      .from('room_types')
      .select('*')
      .order('name')

    // Charger les prix pour cet événement
    const { data: pricingData } = await supabase
      .from('event_room_pricing')
      .select('*')
      .eq('event_id', event.id)

    setRoomTypes(roomTypesData || [])
    setPricing(pricingData || [])
    setLoading(false)
  }, [event.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ...existing code...

  const handlePriceChange = (roomTypeId: string, field: string, value: any) => {
    setPricing(prev => {
      const existing = prev.find(p => p.room_type_id === roomTypeId)
      // Choose which column key to update based on existing row (compat with old migrations)
      const keyToUse = existing
        ? (existing.price_per_night !== undefined ? 'price_per_night' : (existing.price_per_person !== undefined ? 'price_per_person' : field))
        : field

      if (existing) {
        return prev.map(p => 
          p.room_type_id === roomTypeId 
            ? { ...p, [keyToUse]: value }
            : p
        )
      } else {
        return [...prev, {
          event_id: event.id,
          room_type_id: roomTypeId,
          [keyToUse]: value,
          is_active: true
        }]
      }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()

    try {
      // Détecter le nom correct de la colonne prix dans la base
      const priceColumnName = await detectPriceColumnName(supabase)
      console.log(`Using price column: ${priceColumnName}`)

      // Préparer les prix valides (prix strictement supérieurs à 0)
      const validPricing = pricing
        .map(p => {
          const price = p.price_per_night ?? p.price_per_room ?? p.price_per_person
          return { ...p, price_value: price }
        })
        .filter(p => p.price_value != null && p.price_value > 0)

      if (validPricing.length === 0) {
        alert('Aucun prix valide à sauvegarder')
        setSaving(false)
        return
      }

      // Utiliser la fonction utilitaire pour l'upsert avec le bon nom de colonne
      const { error } = await upsertPricing(supabase, validPricing, priceColumnName)

      if (error) {
        console.error('Error saving pricing:', error)
        alert(`Erreur lors de la sauvegarde des prix: ${error.message || error}`)
      } else {
        alert('Prix sauvegardés avec succès')
        loadData()
      }
    } catch (err) {
      console.error('Error in handleSave:', err)
      alert(`Erreur inattendue: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }

    setSaving(false)
  }

  const getPricing = (roomTypeId: string) => {
    return pricing.find(p => p.room_type_id === roomTypeId) || {}
  }

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Chambres & prix</h3>
          <p className="text-sm text-gray-500 mt-1">
            Configurez les tarifs par nuit pour chaque type de chambre
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 bg-turquoise-600 hover:bg-turquoise-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Type de chambre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Prix / nuit
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Actif
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Nb dossiers
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {roomTypes.map((roomType) => {
              const currentPricing = getPricing(roomType.id)
              const nbDossiers = event.client_files?.filter((f: any) => f.room_type_id === roomType.id).length || 0

              return (
                <tr key={roomType.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-gray-900">{roomType.name}</div>
                      {roomType.description && (
                        <div className="text-sm text-gray-500">{roomType.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      value={currentPricing.price_per_night ?? currentPricing.price_per_room ?? currentPricing.price_per_person ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value
                        const val = raw === '' ? null : parseFloat(raw)
                        handlePriceChange(roomType.id, 'price_per_night', val)
                      }}
                      placeholder="0"
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
                    />
                    <span className="ml-2 text-gray-500">€</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <input
                      type="checkbox"
                      checked={currentPricing.is_active !== false}
                      onChange={(e) => handlePriceChange(roomType.id, 'is_active', e.target.checked)}
                      className="w-4 h-4 text-turquoise-600 rounded focus:ring-turquoise-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900">
                    {nbDossiers}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {roomTypes.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Aucun type de chambre configuré</p>
          <p className="text-sm text-gray-400">Les types de chambre doivent être créés dans les paramètres généraux</p>
        </div>
      )}
    </div>
  )
}
