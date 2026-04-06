import { createClient } from '@/lib/supabase/server'
import { Users, Shield, Mail, Clock } from 'lucide-react'

export default async function UtilisateursPage() {
  const supabase = await createClient()

  const { data: profiles } = await supabase
    .from('profils_utilisateurs')
    .select('*')
    .order('date_creation', { ascending: false })

  const roleLabels: Record<string, string> = {
    admin: 'Administrateur',
    manager: 'Manager',
    commercial: 'Commercial',
    utilisateur: 'Utilisateur',
    // Legacy
    agent: 'Agent',
    viewer: 'Lecteur',
  }

  const roleBadge: Record<string, string> = {
    admin: 'bg-red-100 text-red-800 border-red-300',
    manager: 'bg-purple-100 text-purple-800 border-purple-300',
    commercial: 'bg-blue-100 text-blue-800 border-blue-300',
    utilisateur: 'bg-gray-100 text-gray-800 border-gray-300',
    // Legacy
    agent: 'bg-blue-100 text-blue-800 border-blue-300',
    viewer: 'bg-gray-100 text-gray-800 border-gray-300',
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">👥 Utilisateurs</h1>
          <p className="text-gray-600 mt-1">Gestion des utilisateurs et rôles</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-gray-400" />
            <span className="text-2xl font-bold text-gray-900">{profiles?.length || 0}</span>
          </div>
          <p className="text-xs font-medium text-gray-600">Total utilisateurs</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <Shield className="w-5 h-5 text-red-400" />
            <span className="text-2xl font-bold text-gray-900">
              {profiles?.filter(p => p.role === 'admin').length || 0}
            </span>
          </div>
          <p className="text-xs font-medium text-gray-600">Administrateurs</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <span className="text-2xl font-bold text-gray-900">
              {profiles?.filter(p => p.role === 'commercial' || p.role === 'agent').length || 0}
            </span>
          </div>
          <p className="text-xs font-medium text-gray-600">Commerciaux / Agents</p>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {profiles && profiles.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rôle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Créé le</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {profiles.map((profile: any) => (
                  <tr key={profile.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-turquoise-100 text-turquoise-700 flex items-center justify-center font-semibold text-sm">
                          {profile.nom_complet?.[0] || '?'}
                        </div>
                        <span className="ml-3 font-medium text-gray-900">{profile.nom_complet || 'Sans nom'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Mail className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                        {profile.email || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${roleBadge[profile.role] || 'bg-gray-100 text-gray-700'}`}>
                        {roleLabels[profile.role] || profile.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {profile.date_creation ? new Date(profile.date_creation).toLocaleDateString('fr-FR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucun utilisateur trouvé</p>
          </div>
        )}
      </div>
    </div>
  )
}
