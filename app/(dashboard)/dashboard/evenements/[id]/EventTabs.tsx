'use client'

import { useState } from 'react'
import { RoomPricingTab } from './RoomPricingTab'
import { DossiersTab } from './DossiersTab'

type TabType = 'crm' | 'rooms' | 'dossiers' | 'payments' | 'settings'

export function EventTabs({ event }: { event: any }) {
  const [activeTab, setActiveTab] = useState<TabType>('rooms')

  const tabs = [
    { id: 'crm' as TabType, label: '📊 Vue CRM' },
    { id: 'rooms' as TabType, label: '🛏️ Chambres & prix' },
    { id: 'dossiers' as TabType, label: '📁 Dossiers' },
    { id: 'payments' as TabType, label: '💳 Paiements' },
    { id: 'settings' as TabType, label: '⚙️ Paramètres' }
  ]

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Navigation des onglets */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-turquoise-500 text-turquoise-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenu des onglets */}
      <div className="p-6">
        {activeTab === 'crm' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Vue CRM</h3>
            <p className="text-gray-500">Pipeline et stats détaillées - À venir</p>
          </div>
        )}

        {activeTab === 'rooms' && <RoomPricingTab event={event} />}
        
        {activeTab === 'dossiers' && <DossiersTab event={event} />}

        {activeTab === 'payments' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Paiements</h3>
            <p className="text-gray-500">Liste des paiements et liens BRED - À venir</p>
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Paramètres de l'événement</h3>
            <p className="text-gray-500">Configuration avancée - À venir</p>
          </div>
        )}
      </div>
    </div>
  )
}
