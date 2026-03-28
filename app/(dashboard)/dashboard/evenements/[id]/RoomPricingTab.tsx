'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Save, Trash2 } from 'lucide-react'

export function RoomPricingTab({ event }: { event: any }) {
  const [roomTypes, setRoomTypes] = useState<any[]>([])
  const [pricing, setPricing] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [event.id])

  const loadData = async () => {
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
  }

  const handlePriceChange = (roomTypeId: string, field: string, value: any) => {
    setPricing(prev => {
      const existing = prev.find(p => p.room_type_id === roomTypeId)
      if (existing) {
        return prev.map(p => 
          p.room_type_id === roomTypeId 
            ? { ...p, [field]: value }
            : p
        )
      } else {
        return [...prev, {
          event_id: event.id,
          room_type_id: roomTypeId,
          [field]: value,
          is_active: true
        }]
      }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()

    // Supprimer les anciens prix
    await supabase
      .from('event_room_pricing')
      .delete()
      .eq('event_id', event.id)

    // Insérer les nouveaux prix (uniquement ceux qui ont un prix défini)
    const validPricing = pricing.filter(p => p.price_per_night != null && p.price_per_night > 0)
    
    if (validPricing.length > 0) {
      const { error } = await supabase
        .from('event_room_pricing')
        .insert(validPricing)

      if (error) {
        console.error('Error saving pricing:', error)
        alert('Erreur lors de la sauvegarde des prix')
      } else {
        alert('Prix sauvegardés avec succès')
        loadData()
      }
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Acompte
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Occupants max
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
                      value={currentPricing.price_per_night || ''}
                      onChange={(e) => handlePriceChange(roomType.id, 'price_per_night', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
                    />
                    <span className="ml-2 text-gray-500">€</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      value={currentPricing.deposit_amount || ''}
                      onChange={(e) => handlePriceChange(roomType.id, 'deposit_amount', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
                    />
                    <span className="ml-2 text-gray-500">€</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      value={currentPricing.max_occupancy || roomType.max_occupancy || ''}
                      onChange={(e) => handlePriceChange(roomType.id, 'max_occupancy', parseInt(e.target.value) || 0)}
                      placeholder={roomType.max_occupancy?.toString() || '0'}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent"
                    />
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
