import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User, Phone, Mail, Calendar, MapPin, DollarSign, Users, Edit } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { ActionsSidebar } from './ActionsSidebar'
import { ParticipantsSection } from './ParticipantsSection'
import { TimelineSection } from './TimelineSection'
import { NotesSection } from './NotesSection'
import { BIGenerator } from './BIGenerator'
import { EditableDossierSections } from './EditableDossierSections'
import { ManageDossierActions } from './ManageDossierActions'
import { WhatsAppConversation } from './WhatsAppConversation'

export default async function DossierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const { data: clientFile, error } = await supabase
    .from('client_files')
    .select(`
      *,
      events (*),
      leads (*),
      selected_room_type:selected_room_type_id(*),
      flight_inbound:flight_id_inbound(id, airline, flight_number, flight_type, origin, destination, scheduled_time),
      flight_outbound:flight_id_outbound(id, airline, flight_number, flight_type, origin, destination, scheduled_time),
      participants (*),
      payment_links (*),
      internal_notes (*)
    `)
    .eq('id', id)
    .maybeSingle()

  if (error || !clientFile) {
    notFound()
  }

  // Load room types for inline editing
  const { data: roomTypes } = await supabase
    .from('room_types')
    .select('id, code, name')
    .order('name')

  return (
    <div className="p-8">
      {/* Bouton retour */}
      <Link
        href="/dashboard/crm"
        className="inline-flex items-center text-turquoise-600 hover:text-turquoise-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Retour au CRM
      </Link>

      {/* En-tête du dossier */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-4 mb-3">
              <h1 className="text-2xl font-bold text-gray-900">{clientFile.file_reference}</h1>
              <StatusBadge status={clientFile.crm_status} type="crm" />
              <StatusBadge status={clientFile.payment_status} type="payment" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {clientFile.events && (
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  <div>
                    <p className="font-medium text-gray-900">{clientFile.events.name}</p>
                    <p className="text-xs">
                      {new Date(clientFile.events.start_date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              )}

              {clientFile.events?.destination_label && (
                <div className="flex items-center text-gray-600">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>{clientFile.events.destination_label}</span>
                </div>
              )}

              {clientFile.assigned_to && (
                <div className="flex items-center text-gray-600">
                  <User className="w-4 h-4 mr-2" />
                  <span>Assigné à: <span className="font-medium">{clientFile.assigned_to}</span></span>
                </div>
              )}
            </div>
          </div>

          {/* Boutons de gestion du dossier */}
          <div className="flex flex-col items-end gap-2">
            <ManageDossierActions
              dossierId={clientFile.id}
              dossierReference={clientFile.file_reference}
              eventId={clientFile.event_id}
            />
          </div>
        </div>
      </div>

      {/* Layout split-view avec WhatsApp */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Colonne gauche - Contenu principal (60%) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Contact + Séjour + Commercial (inline editable) */}
          <EditableDossierSections clientFile={clientFile} roomTypes={roomTypes || []} />

          {/* Participants */}
          <ParticipantsSection clientFile={clientFile} />

          {/* Paiement */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">💳 Paiement</h2>

            {clientFile.payment_links && clientFile.payment_links.length > 0 ? (
              <div className="space-y-3">
                {clientFile.payment_links.map((link: any) => (
                  <div key={link.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{link.amount.toLocaleString('fr-FR')} €</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        link.status === 'paid' ? 'bg-green-100 text-green-800' :
                        link.status === 'sent' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {link.status}
                      </span>
                    </div>
                    {link.payment_link && (
                      <a
                        href={link.payment_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-turquoise-600 hover:text-turquoise-700"
                      >
                        Voir le lien →
                      </a>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Envoyé le {new Date(link.sent_at || link.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Aucun lien de paiement envoyé</p>
            )}
          </div>

          {/* Facture (Pennylane - placeholder) */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📄 Facture (Pennylane)</h2>
            <p className="text-gray-500 text-sm">
              Intégration Pennylane - À venir
            </p>
          </div>

          {/* Bulletin d'Inscription (BI) */}
          <div className="bg-white rounded-lg shadow p-6">
            <BIGenerator clientFile={clientFile} />
          </div>

          {/* Timeline */}
          <TimelineSection clientFileId={clientFile.id} />

          {/* Notes */}
          <NotesSection clientFile={clientFile} />
        </div>

        {/* Colonne droite - WhatsApp + Actions (40%) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sidebar d'actions */}
          <ActionsSidebar clientFile={clientFile} />

          {/* Conversation WhatsApp */}
          <div className="h-96">
            <WhatsAppConversation clientFile={clientFile} />
          </div>
        </div>
      </div>
    </div>
  )
}
