import { createClient } from '@/lib/supabase/server'
import ParametresClient from './ParametresClient'

export default async function ParametresPage() {
  const supabase = await createClient()

  // Récupérer les types de chambres
  const { data: roomTypes } = await supabase
    .from('room_types')
    .select('*')
    .order('name')

  // Récupérer les destinations depuis les événements
  const { data: eventsList } = await supabase
    .from('events')
    .select('destination_label')
    .not('destination_label', 'is', null)

  const destinations = [...new Set(eventsList?.map(e => e.destination_label).filter(Boolean) || [])]

  // Récupérer tous les événements avec leurs informations
  const { data: allEvents } = await supabase
    .from('events')
    .select('*')
    .order('start_date', { ascending: false })

  return (
    <ParametresClient roomTypes={roomTypes || []} destinations={destinations} events={allEvents || []} />
  )
}
