import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import ClientsTable from './ClientsTable'

export default async function ClientsPage() {
  const supabase = await createClient()

  const { data: clients, error } = await supabase
    .from('clients')
    .select('*')
    .order('date_creation', { ascending: false })
    .limit(200)

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600 mt-1">Gérez votre portefeuille clients</p>
        </div>
        <Link
          href="/dashboard/clients/nouveau"
          className="flex items-center px-4 py-2 bg-turquoise-600 text-white rounded-lg hover:bg-turquoise-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nouveau client
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Total clients</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{clients?.length || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Clients actifs</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {clients?.filter(c => c.statut === 'actif').length || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Prospects</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {clients?.filter(c => c.statut === 'prospect').length || 0}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow">
        <ClientsTable clients={clients || []} />
      </div>
    </div>
  )
}
