import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { EditEventForm } from './EditEventForm'

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !event) {
    notFound()
  }

  const { data: roomTypes } = await supabase
    .from('room_types')
    .select('*')
    .eq('is_active', true)
    .order('display_order')

  const { data: existingPricing } = await supabase
    .from('event_room_pricing')
    .select('*')
    .eq('event_id', id)

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link
        href={`/dashboard/evenements/${id}`}
        className="inline-flex items-center text-turquoise-600 hover:text-turquoise-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Retour à l'événement
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-8">✏️ Modifier l'événement</h1>

      <EditEventForm event={event} roomTypes={roomTypes || []} existingPricing={existingPricing || []} />
    </div>
  )
}
