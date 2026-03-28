'use client'

import Link from 'next/link'
import { Eye, Edit, Building2 } from 'lucide-react'

interface Client {
  id: string
  nom: string
  type_client: string
  secteur_activite?: string
  email?: string
  telephone?: string
  statut: string
  ville?: string
  date_creation: string
}

interface ClientsTableProps {
  clients: Client[]
}

const statutColors: Record<string, string> = {
  actif: 'bg-green-100 text-green-800',
  inactif: 'bg-gray-100 text-gray-800',
  prospect: 'bg-blue-100 text-blue-800',
}

export default function ClientsTable({ clients }: ClientsTableProps) {
  if (clients.length === 0) {
    return (
      <div className="p-12 text-center">
        <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Aucun client pour le moment
        </h3>
        <p className="text-gray-600 mb-6">
          Commencez par créer votre premier client
        </p>
        <Link
          href="/dashboard/clients/nouveau"
          className="inline-flex items-center px-4 py-2 bg-turquoise-600 text-white rounded-lg hover:bg-turquoise-700 transition-colors"
        >
          Créer un client
        </Link>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Client
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Secteur
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Contact
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Statut
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {clients.map((client) => (
            <tr key={client.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-turquoise-100 rounded-full flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-turquoise-600" />
                  </div>
                  <div className="ml-4">
                    <div className=" font-medium text-gray-900">{client.nom}</div>
                    {client.ville && (
                      <div className="text-sm text-gray-500">{client.ville}</div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-900 capitalize">
                  {client.type_client}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {client.secteur_activite || '—'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{client.email || '—'}</div>
                <div className="text-sm text-gray-500">{client.telephone || ''}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statutColors[client.statut]}`}>
                  {client.statut}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-3">
                  <Link
                    href={`/dashboard/clients/${client.id}`}
                    className="text-turquoise-600 hover:text-turquoise-900"
                  >
                    <Eye className="w-5 h-5" />
                  </Link>
                  <Link
                    href={`/dashboard/clients/${client.id}/edit`}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <Edit className="w-5 h-5" />
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
