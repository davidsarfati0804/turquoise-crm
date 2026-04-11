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

  // Load room types + reference flights for inline editing
  const [{ data: roomTypes }, { data: referenceFlights }] = await Promise.all([
    supabase.from('room_types').select('id, code, name').order('name'),
    supabase.from('reference_flights').select('id, airline, flight_number, flight_type, origin, destination, scheduled_time').eq('is_active', true).order('flight_number'),
  ])

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
          {/* Contact + Vols + Séjour + Commercial + Paiement (inline editable) */}
          <EditableDossierSections clientFile={clientFile} roomTypes={roomTypes || []} referenceFlights={referenceFlights || []} />

          {/* Participants */}
          <ParticipantsSection clientFile={clientFile} />

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
        <div className="lg:col-span-2 space-y-6 lg:sticky lg:top-6 lg:self-start">
          {/* Sidebar d'actions */}
          <ActionsSidebar clientFile={clientFile} />

          {/* Conversation WhatsApp */}
          <WhatsAppConversation clientFile={clientFile} />
        </div>
      </div>
    </div>
  )
}
