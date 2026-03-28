import { EventForm } from './EventForm'

export default function NouveauEvenementPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Nouvel événement</h1>
        <p className="text-gray-600 mt-1">Créez un nouveau voyage ou pèlerinage</p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <EventForm />
      </div>
    </div>
  )
}
