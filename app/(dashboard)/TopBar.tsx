'use client'

import { LogOut, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface TopBarProps {
  user: any
  profile: any
}

export default function TopBar({ user, profile }: TopBarProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/dashboard/recherche?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 lg:py-4"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
      <div className="flex items-center justify-between">
        {/* Logo mobile uniquement */}
        <div className="lg:hidden">
          <h1 className="text-lg font-bold text-turquoise-700">🌊 Turquoise</h1>
        </div>

        {/* Titre desktop */}
        <div className="hidden lg:block">
          <h2 className="text-xl font-semibold text-gray-800">
            Bienvenue, {profile?.nom_complet || user.email}
          </h2>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        <div className="flex items-center space-x-2 lg:space-x-4">
          {/* Recherche — cachée sur très petit écran, visible sinon */}
          <form onSubmit={handleSearch} className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-44 lg:w-64 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-turquoise-500 focus:border-transparent bg-gray-50"
            />
          </form>

          <button
            onClick={handleLogout}
            className="flex items-center px-3 lg:px-4 py-2 text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 lg:mr-2" />
            <span className="hidden lg:inline">Déconnexion</span>
          </button>
        </div>
      </div>
    </header>
  )
}
