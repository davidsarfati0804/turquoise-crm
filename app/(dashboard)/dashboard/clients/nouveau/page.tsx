import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientForm from './ClientForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NouveauClientPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link
          href="/dashboard/clients"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux clients
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Nouveau client</h1>
        <p className="text-gray-600 mt-1">Ajoutez un nouveau client à votre portefeuille</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 max-w-4xl">
        <ClientForm userId={user?.id} />
      </div>
    </div>
  )
}
