import { LeadForm } from './LeadForm'

export default function NouveauLeadPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Nouveau lead</h1>
        <p className="text-gray-600 mt-1">Créez un nouveau prospect</p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <LeadForm />
      </div>
    </div>
  )
}
