import { createClient } from '@/lib/supabase/server'
import { Clock } from 'lucide-react'

export async function TimelineSection({ clientFileId }: { clientFileId: string }) {
  const supabase = await createClient()

  const { data: activities } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('client_file_id', clientFileId)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">📅 Timeline</h2>

      {activities && activities.length > 0 ? (
        <div className="space-y-4">
          {activities.map((activity: any) => (
            <div key={activity.id} className="flex items-start space-x-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
              <div className="flex-shrink-0 w-8 h-8 bg-turquoise-100 rounded-full flex items-center justify-center">
                <Clock className="w-4 h-4 text-turquoise-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">{activity.action_type}</p>
                {activity.description && (
                  <p className="text-xs text-gray-500 mt-1">{activity.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(activity.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-sm">Aucune activité enregistrée</p>
      )}
    </div>
  )
}
