import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Calendar, MapPin, Users, DollarSign, ArrowLeft, Edit } from 'lucide-react'
import { EventTabs } from './EventTabs'

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const { data: event, error } = await supabase
    .from('events')
    .select(`
      *,
      client_files (
        id,
        file_reference,
        crm_status,
        payment_status,
        quoted_price
      ),
      event_room_pricing (
        *,
        room_types (*)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !event) {
    notFound()
  }

  // Calculer les stats
  const nbDossiers = event.client_files?.length || 0
  const caEstime = event.client_files?.reduce((sum: number, file: any) => sum + (file.quoted_price || 0), 0) || 0

  return (
    <div className="p-8">
      {/* En-tête */}
      <div className="mb-6">
        <Link 
          href="/dashboard/evenements"
          className="inline-flex items-center text-turquoise-600 hover:text-turquoise-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour aux événements
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.name}</h1>
            <div className="flex items-center space-x-4 text-gray-600">
              <div className="flex items-center">
                <span className="mr-2">
                  {event.event_type === 'sejour' ? '🏖️' : 
                   event.event_type === 'mariage' ? '💒' : '🌴'}
                </span>
                <span className="font-medium">
                  {event.event_type === 'sejour' ? 'Séjour' : 
                   event.event_type === 'mariage' ? 'Mariage' : 'Autre'}
                </span>
              </div>
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                {event.destination_label}
              </div>
            </div>
          </div>
          <Link
            href={`/dashboard/evenements/${event.id}/modifier`}
            className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
          >
            <Edit className="w-4 h-4 mr-2" />
            Modifier
          </Link>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Dossiers</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{nbDossiers}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">CA estimé</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(caEstime)}€
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Validés</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {event.client_files?.filter((f: any) => f.crm_status === 'valide').length || 0}
              </p>
            </div>
            <div className="w-8 h-8 bg-turquoise-100 rounded-full flex items-center justify-center">
              <span className="text-turquoise-600 font-bold">✓</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Payés</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {event.client_files?.filter((f: any) => f.payment_status === 'paid').length || 0}
              </p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-bold">€</span>
            </div>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <EventTabs event={event} />
    </div>
  )
}
