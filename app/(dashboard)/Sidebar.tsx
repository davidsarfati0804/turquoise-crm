'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  Calendar,
  LayoutGrid,
  FileText,
  DollarSign,
  Users,
  Settings,
  FolderOpen,
  MessageSquare,
  Menu,
  X
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
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
  { name: 'Événements', href: '/dashboard/evenements', icon: Calendar },
  { name: 'Dossiers', href: '/dashboard/dossiers', icon: FolderOpen },
  { name: 'Messages', href: '/dashboard/whatsapp', icon: MessageSquare },
  { name: 'Paiements', href: '/dashboard/paiements', icon: DollarSign },
  { name: 'Utilisateurs', href: '/dashboard/utilisateurs', icon: Users },
  {
    name: 'Réglages',
    href: '/dashboard/parametres',
    icon: Settings,
    subItems: [
      { name: 'Généraux', href: '/dashboard/parametres?tab=general' },
      { name: 'Événements', href: '/dashboard/parametres?tab=evenements' },
      { name: '✈️ Vols', href: '/dashboard/parametrage/vols' }
    ]
  },
]

// Les 4 items principaux pour la barre mobile
const mobileNav = [
  { name: 'CRM', href: '/dashboard/crm', icon: LayoutGrid },
  { name: 'Leads', href: '/dashboard/leads', icon: FileText },
  { name: 'Messages', href: '/dashboard/whatsapp', icon: MessageSquare },
  { name: 'Dossiers', href: '/dashboard/dossiers', icon: FolderOpen },
]

interface SidebarProps {
  user: any
  profile: any
}

export default function Sidebar({ user, profile }: SidebarProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      {/* Sidebar desktop (cachée sur mobile) */}
      <div className="hidden lg:flex w-64 bg-gradient-to-b from-turquoise-900 to-turquoise-800 text-white flex-col">
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

      {/* Drawer menu "Plus" sur mobile */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative bg-white rounded-t-2xl shadow-xl p-6 pb-safe"
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">🌊 Turquoise CRM</h3>
              <button onClick={() => setMobileMenuOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(item.href.split('?')[0] + '/')
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex flex-col items-center p-3 rounded-xl transition-colors ${
                      isActive ? 'bg-turquoise-100 text-turquoise-700' : 'bg-gray-50 text-gray-700'
                    }`}
                  >
                    <Icon className="w-6 h-6 mb-1" />
                    <span className="text-xs font-medium text-center">{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Barre de navigation mobile (visible uniquement sur mobile) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-turquoise-900 border-t border-turquoise-700 flex items-center justify-around"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {mobileNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href.split('?')[0] + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center py-2 px-3 min-w-0 flex-1 transition-colors ${
                isActive ? 'text-white' : 'text-turquoise-300'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-xs font-medium truncate">{item.name}</span>
            </Link>
          )
        })}
        {/* Bouton "Plus" ouvre le drawer */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center py-2 px-3 min-w-0 flex-1 transition-colors text-turquoise-300"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-xs font-medium">Plus</span>
        </button>
      </nav>
    </>
  )
}
