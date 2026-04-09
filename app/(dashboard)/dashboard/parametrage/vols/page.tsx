import { createClient } from '@/lib/supabase/server'
import { FlightsManager } from './FlightsManager'

export const metadata = { title: 'Référentiel des vols – Turquoise' }

export default async function VolsPage() {
  const supabase = await createClient()

  const { data: flights } = await supabase
    .from('reference_flights')
    .select('*')
    .order('flight_type')
    .order('airline')
    .order('flight_number')

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">✈️ Référentiel des vols</h1>
        <p className="text-gray-500 text-sm mt-1">Catalogue des vols utilisés pour les transferts. Le numéro de vol est unique.</p>
      </div>
      <FlightsManager initialFlights={flights ?? []} />
    </div>
  )
}
