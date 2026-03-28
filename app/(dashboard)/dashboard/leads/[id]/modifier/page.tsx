import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { EditLeadForm } from './EditLeadForm'

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const { data: lead, error } = await supabase
    .from('leads')
    .select('*, events (id, name, destination_label)')
    .eq('id', id)
    .single()

  if (error || !lead) {
    notFound()
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link
        href="/dashboard/leads"
        className="inline-flex items-center text-turquoise-600 hover:text-turquoise-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Retour aux leads
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Modifier le lead</h1>
        <p className="text-gray-600 mt-1">{lead.first_name} {lead.last_name}</p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <EditLeadForm lead={lead} />
      </div>
    </div>
  )
}
