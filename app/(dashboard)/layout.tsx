import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { ToastProvider } from '@/components/shared/toast'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/login')
  }

  // Récupérer le profil
  const { data: profile } = await supabase
    .from('profils_utilisateurs')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <ToastProvider>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <Sidebar user={user} profile={profile} />
        
        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar user={user} profile={profile} />
          
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
