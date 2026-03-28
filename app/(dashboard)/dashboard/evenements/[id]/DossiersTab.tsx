'use client'

import Link from 'next/link'

export function DossiersTab({ event }: { event: any }) {
  const dossiers = event.client_files || []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Dossiers clients</h3>
          <p className="text-sm text-gray-500 mt-1">
            {dossiers.length} dossier(s) pour cet événement
          </p>
        </div>
      </div>

      {dossiers.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Référence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Statut CRM
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Paiement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Prix total
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dossiers.map((dossier: any) => (
                <tr key={dossier.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link 
                      href={`/dashboard/dossiers/${dossier.id}`}
                      className="font-medium text-turquoise-600 hover:text-turquoise-800"
                    >
                      {dossier.reference}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {dossier.crm_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      dossier.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                      dossier.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {dossier.payment_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {dossier.total_price ? `${dossier.total_price.toLocaleString('fr-FR')} €` : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <Link 
                      href={`/dashboard/dossiers/${dossier.id}`}
                      className="text-turquoise-600 hover:text-turquoise-800 font-medium"
                    >
                      Voir détails →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-2">Aucun dossier pour cet événement</p>
          <p className="text-sm text-gray-400 mb-6">Les dossiers sont créés à partir des leads</p>
          <Link
            href="/dashboard/leads"
            className="inline-flex items-center px-4 py-2 bg-turquoise-600 hover:bg-turquoise-700 text-white rounded-lg font-medium transition-colors"
          >
            Voir les leads
          </Link>
        </div>
      )}
    </div>
  )
}
