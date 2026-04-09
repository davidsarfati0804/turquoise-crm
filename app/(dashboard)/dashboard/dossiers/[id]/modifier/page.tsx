import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { EditDossierForm } from './EditDossierForm'

export default async function EditDossierPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const { data: clientFile, error } = await supabase
    .from('client_files')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !clientFile) notFound()

  const [roomTypesRes, eventsRes, flightsRes] = await Promise.all([
    supabase.from('room_types').select('id, code, name').order('name'),
    supabase.from('events').select('id, name, destination_label')
      .in('status', ['upcoming', 'active', 'draft']).order('name'),
    supabase.from('reference_flights').select('id, airline, flight_number, scheduled_time, flight_type')
      .eq('is_active', true).order('flight_type').order('flight_number'),
  ])

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href={`/dashboard/dossiers/${clientFile.id}`}
        className="inline-flex items-center text-turquoise-600 hover:text-turquoise-700 mb-6">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Retour au dossier
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Modifier le dossier</h1>
        <p className="text-gray-600 mt-1">{clientFile.file_reference}</p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <EditDossierForm
          clientFile={clientFile}
          roomTypes={roomTypesRes.data || []}
          events={eventsRes.data || []}
          flights={flightsRes.data || []}
        />
      </div>
    </div>
  )
}
