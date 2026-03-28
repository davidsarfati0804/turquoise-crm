import { createClient } from '@/lib/supabase/server'
import { Settings, Hotel, Globe, Building } from 'lucide-react'

export default async function ParametresPage() {
  const supabase = await createClient()

  // Récupérer les types de chambres
  const { data: roomTypes } = await supabase
    .from('room_types')
    .select('*')
    .order('name')

  // Récupérer les destinations depuis les événements
  const { data: events } = await supabase
    .from('events')
    .select('destination_label')
    .not('destination_label', 'is', null)

  const destinations = [...new Set(events?.map(e => e.destination_label).filter(Boolean) || [])]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">⚙️ Paramètres</h1>
        <p className="text-gray-600 mt-1">Configuration de l&apos;application</p>
      </div>

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
                  <div key={room.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{room.name}</p>
                      {room.description && (
                        <p className="text-sm text-gray-500">{room.description}</p>
                      )}
                    </div>
                    <p className="font-semibold text-turquoise-600">
                      {room.price_per_night
                        ? `${new Intl.NumberFormat('fr-FR').format(room.price_per_night)}€/nuit`
                        : '—'}
                    </p>
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

        {/* Intégrations */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center">
              <Settings className="w-5 h-5 text-turquoise-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Intégrations</h2>
            </div>
          </div>
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
              <div className="flex items-center">
                <span className="text-xl mr-3">📄</span>
                <div>
                  <p className="font-medium text-gray-900">Google Docs</p>
                  <p className="text-sm text-gray-500">Génération de bulletins d&apos;inscription</p>
                </div>
              </div>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                ✓ Connecté
              </span>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
              <div className="flex items-center">
                <span className="text-xl mr-3">💬</span>
                <div>
                  <p className="font-medium text-gray-900">WhatsApp API</p>
                  <p className="text-sm text-gray-500">Réception de leads via WhatsApp</p>
                </div>
              </div>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                ✓ Connecté
              </span>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
              <div className="flex items-center">
                <span className="text-xl mr-3">📧</span>
                <div>
                  <p className="font-medium text-gray-900">Email (SMTP)</p>
                  <p className="text-sm text-gray-500">Envoi de bulletins et confirmations</p>
                </div>
              </div>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                ✓ Connecté
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
