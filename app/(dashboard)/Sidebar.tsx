'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Calendar, 
  LayoutGrid, 
  FileText, 
  DollarSign,
  Users,
  Settings,
  FolderOpen
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Événements', href: '/dashboard/evenements', icon: Calendar },
  { 
    name: 'CRM', 
    href: '/dashboard/crm', 
    icon: LayoutGrid,
    subItems: [
      { name: 'Pipeline', href: '/dashboard/crm?view=pipeline' },
      { name: 'Table', href: '/dashboard/crm?view=table' }
    ]
  },
  { name: 'Leads', href: '/dashboard/leads', icon: FileText },
  { name: 'Dossiers', href: '/dashboard/dossiers', icon: FolderOpen },
  { name: 'Paiements', href: '/dashboard/paiements', icon: DollarSign },
  { name: 'Utilisateurs', href: '/dashboard/utilisateurs', icon: Users },
  { name: 'Paramètres', href: '/dashboard/parametres', icon: Settings },
]

interface SidebarProps {
  user: any
  profile: any
}

export default function Sidebar({ user, profile }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-gradient-to-b from-turquoise-900 to-turquoise-800 text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-turquoise-700">
        <h1 className="text-2xl font-bold">🌊 Turquoise</h1>
        <p className="text-turquoise-200 text-sm">Travel Agency CRM</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href.split('?')[0] + '/')
          const Icon = item.icon
          
          return (
            <div key={item.name}>
              <Link
                href={item.href}
                className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-turquoise-700 text-white'
                    : 'text-turquoise-100 hover:bg-turquoise-700/50'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                <span className="font-medium">{item.name}</span>
              </Link>
              {item.subItems && isActive && (
                <div className="ml-11 mt-1 space-y-1">
                  {item.subItems.map((subItem) => (
                    <Link
                      key={subItem.name}
                      href={subItem.href}
                      className="block rounded-lg px-3 py-1.5 text-xs text-turquoise-200 hover:bg-turquoise-700 hover:text-white transition-colors"
                    >
                      {subItem.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-turquoise-700">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-turquoise-600 rounded-full flex items-center justify-center">
            <span className="text-lg font-bold">
              {profile?.nom_complet?.[0] || user.email?.[0] || 'U'}
            </span>
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {profile?.nom_complet || 'Utilisateur'}
            </p>
            <p className="text-xs text-turquoise-200 truncate">
              {profile?.role || 'Utilisateur'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
