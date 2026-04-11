import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, MessageSquare, Phone, Mail, Calendar, Edit, AlertTriangle } from 'lucide-react'
import { ConvertToFileButton } from './ConvertToFileButton'
import { DeleteLeadButton } from './DeleteLeadButton'
import { SOURCE_LABELS } from '@/lib/constants/statuses'

export default async function LeadsPage() {
  const supabase = await createClient()

  const { data: leads, error } = await supabase
    .from('leads')
    .select(`
      *,
      events (name, start_date)
    `)
    .is('converted_to_file_id', null)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('Error fetching leads:', error)
  }

  // Grouper par source
  const leadsBySource = {
    whatsapp: leads?.filter(l => l.source === 'whatsapp') || [],
    phone: leads?.filter(l => l.source === 'phone') || [],
    manual: leads?.filter(l => l.source === 'manual') || [],
    email: leads?.filter(l => l.source === 'email') || [],
    other: leads?.filter(l => !['whatsapp', 'phone', 'manual', 'email'].includes(l.source)) || []
  }

  // Indicateur: leads non-traités de plus de 24h
  const now = new Date()
  const isOldLead = (createdAt: string) => {
    const diff = now.getTime() - new Date(createdAt).getTime()
    return diff > 24 * 60 * 60 * 1000
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📝 Leads</h1>
          <p className="text-gray-600 mt-1">Gérez vos prospects et conversions</p>
        </div>
        <Link
          href="/dashboard/leads/nouveau"
          className="inline-flex items-center px-4 py-2 bg-turquoise-600 hover:bg-turquoise-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nouveau lead
        </Link>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-600">Total leads actifs</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{leads?.length || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-600">💬 WhatsApp</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{leadsBySource.whatsapp.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-600">📞 Téléphone</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{leadsBySource.phone.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-600">✍️ Manuel</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{leadsBySource.manual.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-600">📧 Email</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{leadsBySource.email.length}</p>
        </div>
      </div>

      {/* Liste des leads */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {leads && leads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Voyageurs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Événement pressenti
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leads.map((lead: any) => (
                  <tr key={lead.id} className={`hover:bg-gray-50 ${isOldLead(lead.created_at) ? 'bg-red-50/50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        {isOldLead(lead.created_at) && (
                          <span title="Lead non-traité > 24h">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-500 mr-1.5" />
                          </span>
                        )}
                        {new Date(lead.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                        lead.source === 'whatsapp' ? 'bg-green-100 text-green-800' :
                        lead.source === 'phone' ? 'bg-orange-100 text-orange-800' :
                        lead.source === 'email' ? 'bg-purple-100 text-purple-800' :
                        lead.source === 'manual' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {SOURCE_LABELS[lead.source] || lead.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">{lead.first_name} {lead.last_name}</p>
                        <div className="flex items-center space-x-3 mt-1 text-gray-500">
                          {lead.phone && (
                            <div className="flex items-center space-x-1.5">
                              <a href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-green-600 text-xs" title="Ouvrir WhatsApp">
                                💬
                              </a>
                              <a href={`tel:${lead.phone}`} className="flex items-center hover:text-turquoise-600">
                                <Phone className="w-3 h-3 mr-1" />
                                {lead.phone}
                              </a>
                            </div>
                          )}
                          {lead.email && (
                            <a href={`mailto:${lead.email}`} className="flex items-center hover:text-turquoise-600">
                              <Mail className="w-3 h-3 mr-1" />
                              {lead.email}
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {lead.adults_count || 1} ad.{lead.children_count ? ` ${lead.children_count} enf.` : ''}{lead.babies_count ? ` ${lead.babies_count} bb.` : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {lead.events ? (
                        <div className="flex items-center text-sm">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          <span className="text-gray-900">{lead.events.name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          href={`/dashboard/leads/${lead.id}/modifier`}
                          className="text-gray-400 hover:text-turquoise-600 transition-colors p-1"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <ConvertToFileButton lead={lead} />
                        <DeleteLeadButton leadId={lead.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">Aucun lead actif</p>
            <p className="text-gray-400 text-sm mb-6">Commencez par créer votre premier lead</p>
            <Link
              href="/dashboard/leads/nouveau"
              className="inline-flex items-center px-4 py-2 bg-turquoise-600 hover:bg-turquoise-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Créer un lead
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
