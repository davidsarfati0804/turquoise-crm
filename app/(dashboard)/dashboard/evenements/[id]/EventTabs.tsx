'use client'

import { useState } from 'react'
import { RoomPricingTab } from './RoomPricingTab'
import { DossiersTab } from './DossiersTab'
import { TransfersTab } from './TransfersTab'
import { RoomsAssignmentTab } from './RoomsAssignmentTab'
import { NannyTab } from './NannyTab'
import { EventDashboardTab } from './EventDashboardTab'

type TabType = 'crm' | 'rooms' | 'dossiers' | 'payments' | 'transfers' | 'rooms_assign' | 'nanny' | 'dashboard'

export function EventTabs({ event }: { event: { id: string; [key: string]: unknown } }) {
  const [activeTab, setActiveTab] = useState<TabType>('dossiers')

  const tabs: { id: TabType; label: string }[] = [
    { id: 'dashboard',    label: '📊 Dashboard live' },
    { id: 'dossiers',     label: '📁 Dossiers' },
    { id: 'transfers',    label: '✈️ Transferts' },
    { id: 'rooms_assign', label: '🛏️ Chambres' },
    { id: 'nanny',        label: '👶 Nanny' },
    { id: 'rooms',        label: '💶 Prix chambres' },
    { id: 'payments',     label: '💳 Paiements' },
  ]

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="flex space-x-1 px-4 min-w-max" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {activeTab === 'dashboard'    && <EventDashboardTab eventId={event.id} />}
        {activeTab === 'dossiers'     && <DossiersTab event={event} />}
        {activeTab === 'transfers'    && <TransfersTab eventId={event.id} />}
        {activeTab === 'rooms_assign' && <RoomsAssignmentTab eventId={event.id} />}
        {activeTab === 'nanny'        && <NannyTab eventId={event.id} />}
        {activeTab === 'rooms'        && <RoomPricingTab event={event} />}
        {activeTab === 'payments'     && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Paiements</h3>
            <p className="text-gray-500">Liste des paiements et liens BRED — À venir</p>
          </div>
        )}
      </div>
    </div>
  )
}
