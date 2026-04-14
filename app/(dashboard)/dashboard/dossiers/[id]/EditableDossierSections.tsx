'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Edit, Save, X, Phone, Mail, Tag, Plane, Baby, MessageSquare } from 'lucide-react'

interface RoomType { id: string; code: string; name: string }
interface ReferenceFlight { id: string; airline: string; flight_number: string; flight_type: string; origin: string; destination: string; scheduled_time: string }

interface Props {
  clientFile: any
  roomTypes: RoomType[]
  referenceFlights: ReferenceFlight[]
}

const NANNIES = ['Sarah', 'Amina', 'Priya', 'Mala', 'Divya', 'Kavita', 'Nisha', 'Asha', 'Rekha', 'Sunita']

export function EditableDossierSections({ clientFile, roomTypes, referenceFlights }: Props) {
  const router = useRouter()
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // — Contact —
  const [firstName, setFirstName] = useState(clientFile.primary_contact_first_name || '')
  const [lastName, setLastName] = useState(clientFile.primary_contact_last_name || '')
  // Ne jamais afficher un LID dans le champ téléphone
  const rawPhone = clientFile.primary_contact_phone || ''
  const [phone, setPhone] = useState(rawPhone.startsWith('lid:') ? '' : rawPhone)
  const [email, setEmail] = useState(clientFile.primary_contact_email || '')

  // — Commercial —
  const [roomTypeId, setRoomTypeId] = useState(clientFile.selected_room_type_id || '')
  const [quotedPrice, setQuotedPrice] = useState<string>(clientFile.quoted_price?.toString() || '')
  const [cataloguePrice, setCataloguePrice] = useState<number | null>(null)
  const [reduction, setReduction] = useState<string>('0')
  const [adultsCount, setAdultsCount] = useState(clientFile.adults_count || 1)
  const [childrenCount, setChildrenCount] = useState(clientFile.children_count || 0)
  const [babiesCount, setBabiesCount] = useState(clientFile.babies_count || 0)

  // — Vols —
  const [flightIdInbound, setFlightIdInbound] = useState(clientFile.flight_id_inbound || '')
  const [flightDateInbound, setFlightDateInbound] = useState(clientFile.flight_date_inbound || '')
  const [flightIdOutbound, setFlightIdOutbound] = useState(clientFile.flight_id_outbound || '')
  const [flightDateOutbound, setFlightDateOutbound] = useState(clientFile.flight_date_outbound || '')

  // — Séjour (champs dossier) —
  const [sejourStartDate, setSejourStartDate] = useState(clientFile.sejour_start_date || '')
  const [sejourEndDate, setSejourEndDate] = useState(clientFile.sejour_end_date || '')
  const [roomNumber, setRoomNumber] = useState(clientFile.room_number || '')
  const [nannouIncluded, setNannouIncluded] = useState(clientFile.nounou_included || false)
  const [nannyName, setNannyName] = useState(clientFile.nanny_name || '')
  const [nannyName2, setNannyName2] = useState(clientFile.nanny_name_2 || '')
  const [transferNotes, setTransferNotes] = useState(clientFile.transfer_notes || '')

  // — Commercial: réduction mode —
  const [reductionMode, setReductionMode] = useState<'euro' | 'percent'>('euro')

  // Prix catalogue auto
  useEffect(() => {
    if (!roomTypeId || !clientFile.event_id) { setCataloguePrice(null); return }
    const fetchPrice = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('event_room_pricing')
        .select('price_per_night')
        .eq('event_id', clientFile.event_id)
        .eq('room_type_id', roomTypeId)
        .maybeSingle()
      const ppn = (data as any)?.price_per_night
      const nights = clientFile.events?.nights_count || 0
      if (ppn && nights) {
        const base = Math.round(ppn * nights * 100) / 100
        setCataloguePrice(base)
        if (!quotedPrice) setQuotedPrice(base.toString())
      } else {
        setCataloguePrice(null)
      }
    }
    fetchPrice()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomTypeId])

  const parsedQuoted = parseFloat(quotedPrice) || 0
  const parsedReduction = reductionMode === 'percent'
    ? Math.round((parsedQuoted * (parseFloat(reduction) || 0) / 100) * 100) / 100
    : parseFloat(reduction) || 0
  const finalPrice = Math.round(Math.max(0, parsedQuoted - parsedReduction) * 100) / 100

  const saveSection = async (section: string) => {
    setSaving(true)
    const supabase = createClient()
    let updateData: any = {}

    if (section === 'contact') {
      updateData = {
        primary_contact_first_name: firstName,
        primary_contact_last_name: lastName,
        primary_contact_phone: phone || null,
        primary_contact_email: email || null,
      }
      // Si l'ancien primary_contact_phone était un LID, le migrer dans whatsapp_lid
      const oldPhone = clientFile.primary_contact_phone || ''
      if (oldPhone.startsWith('lid:') && !clientFile.whatsapp_lid) {
        updateData.whatsapp_lid = oldPhone
      }
    } else if (section === 'commercial') {
      const fp = parsedReduction > 0 ? finalPrice : (parseFloat(quotedPrice) || null)
      const ap = clientFile.amount_paid || 0
      updateData = {
        selected_room_type_id: roomTypeId || null,
        quoted_price: fp,
        balance_due: fp != null ? Math.max(0, fp - ap) : null,
        adults_count: adultsCount,
        children_count: childrenCount,
        babies_count: babiesCount,
        total_participants: adultsCount + childrenCount + babiesCount,
      }
    } else if (section === 'vols') {
      updateData = {
        flight_id_inbound: flightIdInbound || null,
        flight_date_inbound: flightDateInbound || null,
        flight_id_outbound: flightIdOutbound || null,
        flight_date_outbound: flightDateOutbound || null,
      }
    } else if (section === 'sejour') {
      updateData = {
        sejour_start_date: sejourStartDate || null,
        sejour_end_date: sejourEndDate || null,
        room_number: roomNumber || null,
        nounou_included: nannouIncluded,
        nanny_name: nannyName || null,
        nanny_name_2: nannyName2 || null,
        transfer_notes: transferNotes || null,
      }
    }

    const { error } = await supabase.from('client_files').update(updateData).eq('id', clientFile.id)
    if (error) { alert('Erreur: ' + error.message) } else { setEditingSection(null); router.refresh() }
    setSaving(false)
  }

  const cancelEdit = (section: string) => {
    if (section === 'contact') {
      setFirstName(clientFile.primary_contact_first_name || '')
      setLastName(clientFile.primary_contact_last_name || '')
      setPhone(clientFile.primary_contact_phone || '')
      setEmail(clientFile.primary_contact_email || '')
    } else if (section === 'commercial') {
      setRoomTypeId(clientFile.selected_room_type_id || '')
      setQuotedPrice(clientFile.quoted_price || '')
      setAdultsCount(clientFile.adults_count || 1)
      setChildrenCount(clientFile.children_count || 0)
      setBabiesCount(clientFile.babies_count || 0)
    } else if (section === 'vols') {
      setFlightIdInbound(clientFile.flight_id_inbound || '')
      setFlightDateInbound(clientFile.flight_date_inbound || '')
      setFlightIdOutbound(clientFile.flight_id_outbound || '')
      setFlightDateOutbound(clientFile.flight_date_outbound || '')
    } else if (section === 'sejour') {
      setRoomNumber(clientFile.room_number || '')
      setNannouIncluded(clientFile.nounou_included || false)
      setNannyName(clientFile.nanny_name || '')
      setNannyName2(clientFile.nanny_name_2 || '')
      setTransferNotes(clientFile.transfer_notes || '')
    }
    setEditingSection(null)
  }

  const selectedRoom = roomTypes.find(rt => rt.id === roomTypeId)
  const allersFlights = referenceFlights.filter(f => f.flight_type === 'aller')
  const retoursFlights = referenceFlights.filter(f => f.flight_type === 'retour')
  const selectedFlightIn = referenceFlights.find(f => f.id === flightIdInbound)
  const selectedFlightOut = referenceFlights.find(f => f.id === flightIdOutbound)

  // ── Helper: header with pencil ──────────────────────────────
  const SectionHeader = ({ section, emoji, title }: { section: string; emoji: string; title: string }) => (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-gray-900">{emoji} {title}</h2>
      {editingSection !== section ? (
        <button onClick={() => setEditingSection(section)}
          className="text-gray-400 hover:text-turquoise-600 transition-colors" title="Modifier">
          <Edit className="w-4 h-4" />
        </button>
      ) : (
        <div className="flex space-x-2">
          <button onClick={() => saveSection(section)} disabled={saving}
            className="inline-flex items-center px-3 py-1 bg-turquoise-600 text-white text-xs rounded-lg hover:bg-turquoise-700 disabled:opacity-50">
            <Save className="w-3 h-3 mr-1" /> Sauver
          </button>
          <button onClick={() => cancelEdit(section)}
            className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200">
            <X className="w-3 h-3 mr-1" /> Annuler
          </button>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* ── Contact ── */}
      <div className="bg-white rounded-lg shadow p-6">
        <SectionHeader section="contact" emoji="👤" title="Contact" />
        {editingSection === 'contact' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Prénom', val: firstName, set: setFirstName, type: 'text' },
              { label: 'Nom', val: lastName, set: setLastName, type: 'text' },
              { label: 'Téléphone', val: phone, set: setPhone, type: 'tel' },
              { label: 'Email', val: email, set: setEmail, type: 'email' },
            ].map(({ label, val, set, type }) => (
              <div key={label}>
                <label className="text-sm text-gray-500 mb-1 block">{label}</label>
                <input type={type} value={val} onChange={e => set(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent text-sm" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Nom</p>
              <p className="font-medium text-gray-900">
                {clientFile.primary_contact_first_name || clientFile.leads?.first_name}{' '}
                {clientFile.primary_contact_last_name || clientFile.leads?.last_name}
              </p>
            </div>
            {/* Téléphone — uniquement si c'est un vrai numéro (pas un LID) */}
            {(() => {
              const p = clientFile.primary_contact_phone || clientFile.leads?.phone || ''
              const displayPhone = p.startsWith('lid:') ? '' : p
              return displayPhone ? (
                <div>
                  <p className="text-sm text-gray-500">Téléphone</p>
                  <a href={`tel:${displayPhone}`}
                    className="flex items-center text-turquoise-600 hover:text-turquoise-700 font-medium">
                    <Phone className="w-4 h-4 mr-2" />
                    {displayPhone}
                  </a>
                </div>
              ) : null
            })()}
            {/* WhatsApp LID — identifiant stable WhatsApp */}
            {(clientFile.whatsapp_lid || (clientFile.primary_contact_phone || '').startsWith('lid:')) && (
              <div>
                <p className="text-sm text-gray-500">WhatsApp ID</p>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 rounded-lg text-xs font-mono text-green-800">
                  <MessageSquare className="w-3.5 h-3.5 text-green-600" />
                  {clientFile.whatsapp_lid || clientFile.primary_contact_phone}
                </span>
              </div>
            )}
            {(clientFile.primary_contact_email || clientFile.leads?.email) && (
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <a href={`mailto:${clientFile.primary_contact_email || clientFile.leads?.email}`}
                  className="flex items-center text-turquoise-600 hover:text-turquoise-700 font-medium">
                  <Mail className="w-4 h-4 mr-2" />
                  {clientFile.primary_contact_email || clientFile.leads?.email}
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Vols ── */}
      <div className="bg-white rounded-lg shadow p-6">
        <SectionHeader section="vols" emoji="✈️" title="Vols" />
        {editingSection === 'vols' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Vol aller (arrivée)</label>
                <select value={flightIdInbound} onChange={e => setFlightIdInbound(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 text-sm">
                  <option value="">— Non défini —</option>
                  {allersFlights.map(f => (
                    <option key={f.id} value={f.id}>{f.flight_number} — {f.airline} ({f.scheduled_time?.slice(0,5)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Date arrivée</label>
                <input type="date" value={flightDateInbound} onChange={e => setFlightDateInbound(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Vol retour (départ)</label>
                <select value={flightIdOutbound} onChange={e => setFlightIdOutbound(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 text-sm">
                  <option value="">— Non défini —</option>
                  {retoursFlights.map(f => (
                    <option key={f.id} value={f.id}>{f.flight_number} — {f.airline} ({f.scheduled_time?.slice(0,5)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Date départ</label>
                <input type="date" value={flightDateOutbound} onChange={e => setFlightDateOutbound(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 text-sm" />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedFlightIn || clientFile.flight_inbound ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-blue-600 uppercase mb-1">Aller — Arrivée MRU</p>
                <p className="font-bold text-gray-900">{(selectedFlightIn || clientFile.flight_inbound)?.flight_number}</p>
                <p className="text-sm text-gray-700">{(selectedFlightIn || clientFile.flight_inbound)?.airline}</p>
                <p className="text-sm font-medium text-blue-700 mt-1">{(selectedFlightIn || clientFile.flight_inbound)?.scheduled_time?.slice(0,5)}</p>
                {(flightDateInbound || clientFile.flight_date_inbound) && (
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(flightDateInbound || clientFile.flight_date_inbound).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 flex items-center gap-2 text-gray-400 text-sm">
                <Plane className="w-4 h-4" /> Vol aller non assigné
              </div>
            )}
            {selectedFlightOut || clientFile.flight_outbound ? (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-orange-600 uppercase mb-1">Retour — Départ MRU</p>
                <p className="font-bold text-gray-900">{(selectedFlightOut || clientFile.flight_outbound)?.flight_number}</p>
                <p className="text-sm text-gray-700">{(selectedFlightOut || clientFile.flight_outbound)?.airline}</p>
                <p className="text-sm font-medium text-orange-700 mt-1">{(selectedFlightOut || clientFile.flight_outbound)?.scheduled_time?.slice(0,5)}</p>
                {(flightDateOutbound || clientFile.flight_date_outbound) && (
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(flightDateOutbound || clientFile.flight_date_outbound).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 flex items-center gap-2 text-gray-400 text-sm">
                <Plane className="w-4 h-4" /> Vol retour non assigné
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Séjour ── */}
      {clientFile.events && (
        <div className="bg-white rounded-lg shadow p-6">
          <SectionHeader section="sejour" emoji="🏨" title="Séjour" />
          {/* Dates event (lecture seule) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Arrivée</p>
              <p className="font-medium text-gray-900">
                {clientFile.events.arrival_date
                  ? new Date(clientFile.events.arrival_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Départ</p>
              <p className="font-medium text-gray-900">
                {clientFile.events.departure_date
                  ? new Date(clientFile.events.departure_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Nuits</p>
              <p className="font-medium text-gray-900">{clientFile.events.nights_count || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Pension</p>
              <p className="font-medium text-gray-900">
                {clientFile.events.pension_type === 'pension_complete' ? 'Pension complète' :
                 clientFile.events.pension_type === 'demi_pension' ? 'Demi-pension' :
                 clientFile.events.pension_type === 'all_inclusive' ? 'All inclusive' :
                 clientFile.events.pension_type === 'petit_dejeuner' ? 'Petit déjeuner' :
                 clientFile.events.pension_type || '—'}
              </p>
            </div>
          </div>

          {/* Champs éditables du dossier */}
          {editingSection === 'sejour' ? (
            <div className="space-y-4 border-t border-gray-100 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">Arrivée (dossier)</label>
                  <input type="date" value={sejourStartDate} onChange={e => setSejourStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 text-sm" />
                </div>
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">Départ (dossier)</label>
                  <input type="date" value={sejourEndDate} onChange={e => setSejourEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">N° de chambre</label>
                  <input type="text" value={roomNumber} onChange={e => setRoomNumber(e.target.value)}
                    placeholder="Ex: 204"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 text-sm" />
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <input type="checkbox" id="nannou" checked={nannouIncluded} onChange={e => setNannouIncluded(e.target.checked)}
                    className="w-4 h-4 text-turquoise-600 rounded" />
                  <label htmlFor="nannou" className="text-sm font-medium text-gray-700">Nounou privée incluse</label>
                </div>
              </div>
              {nannouIncluded && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500 mb-1 block">Nanny principale</label>
                    <input list="nannies-1" type="text" value={nannyName} onChange={e => setNannyName(e.target.value)}
                      placeholder="Prénom de la nanny"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 text-sm" />
                    <datalist id="nannies-1">{NANNIES.map(n => <option key={n} value={n} />)}</datalist>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 mb-1 block">Nanny 2 (optionnel)</label>
                    <input list="nannies-2" type="text" value={nannyName2} onChange={e => setNannyName2(e.target.value)}
                      placeholder="Optionnel"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 text-sm" />
                    <datalist id="nannies-2">{NANNIES.map(n => <option key={n} value={n} />)}</datalist>
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Notes transfert</label>
                <textarea value={transferNotes} onChange={e => setTransferNotes(e.target.value)} rows={2}
                  placeholder="Ex: vol décalé, besoin d'un grand véhicule..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 text-sm" />
              </div>
            </div>
          ) : (
            <div className="border-t border-gray-100 pt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
              {(clientFile.sejour_start_date || clientFile.sejour_end_date) && (
                <>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Arrivée (dossier)</p>
                    <p className="font-medium text-gray-900">
                      {clientFile.sejour_start_date ? new Date(clientFile.sejour_start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Départ (dossier)</p>
                    <p className="font-medium text-gray-900">
                      {clientFile.sejour_end_date ? new Date(clientFile.sejour_end_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                    </p>
                  </div>
                </>
              )}
              <div>
                <p className="text-sm text-gray-500 mb-1">N° chambre</p>
                <p className="font-medium text-gray-900">{clientFile.room_number || <span className="text-gray-400">—</span>}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Nounou</p>
                <p className="font-medium text-gray-900">{clientFile.nounou_included ? '✅ Incluse' : '—'}</p>
              </div>
              {clientFile.nounou_included && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Nanny(s)</p>
                  <div className="flex flex-wrap gap-1">
                    {clientFile.nanny_name ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                        <Baby className="w-3 h-3 mr-1" />{clientFile.nanny_name}
                      </span>
                    ) : <span className="text-xs text-orange-500">⚠️ Non assignée</span>}
                    {clientFile.nanny_name_2 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                        <Baby className="w-3 h-3 mr-1" />{clientFile.nanny_name_2}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {clientFile.transfer_notes && (
                <div className="col-span-2 md:col-span-3">
                  <p className="text-sm text-gray-500 mb-1">Notes transfert</p>
                  <p className="text-sm text-gray-700">{clientFile.transfer_notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Commercial ── */}
      <div className="bg-white rounded-lg shadow p-6">
        <SectionHeader section="commercial" emoji="💼" title="Commercial" />
        {editingSection === 'commercial' ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Type de chambre</label>
              <select value={roomTypeId} onChange={e => setRoomTypeId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 text-sm">
                <option value="">-- Non défini --</option>
                {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
              </select>
            </div>
            {cataloguePrice != null && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <p className="text-blue-600 font-medium">
                  Prix catalogue : <span className="font-bold">{cataloguePrice.toLocaleString('fr-FR')} €</span>
                  <span className="text-blue-400 font-normal ml-1">({clientFile.events?.nights_count} nuits)</span>
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Prix de base (€)</label>
                <input type="number" step="0.01" min="0" value={quotedPrice}
                  onChange={e => setQuotedPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                  <Tag className="w-3 h-3" /> Réduction
                  <span className="flex rounded-md border border-gray-200 overflow-hidden text-xs">
                    <button type="button" onClick={() => setReductionMode('euro')}
                      className={`px-2 py-0.5 font-medium transition-colors ${reductionMode === 'euro' ? 'bg-orange-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>€</button>
                    <button type="button" onClick={() => setReductionMode('percent')}
                      className={`px-2 py-0.5 font-medium transition-colors ${reductionMode === 'percent' ? 'bg-orange-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>%</button>
                  </span>
                </label>
                <input type="number" step="0.01" min="0" max={reductionMode === 'percent' ? 100 : undefined} value={reduction}
                  onChange={e => setReduction(e.target.value)} placeholder="0"
                  className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-400 text-sm" />
              </div>
            </div>
            {parsedReduction > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
                <p className="text-orange-700 font-medium">
                  Prix final : <span className="font-bold text-orange-800">{finalPrice.toLocaleString('fr-FR')} €</span>
                  <span className="ml-2 text-orange-500">(-{parsedReduction.toLocaleString('fr-FR')} €{reductionMode === 'percent' ? ` / ${reduction}%` : ''})</span>
                </p>
              </div>
            )}
            <div>
              <label className="text-sm text-gray-500 mb-2 block">Voyageurs</label>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Adultes', val: adultsCount, set: setAdultsCount, min: 1 },
                  { label: 'Enfants', val: childrenCount, set: setChildrenCount, min: 0 },
                  { label: 'Bébés', val: babiesCount, set: setBabiesCount, min: 0 },
                ].map(({ label, val, set, min }) => (
                  <div key={label}>
                    <label className="text-xs text-gray-400 block">{label}</label>
                    <input type="number" min={min} value={val} onChange={e => set(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 text-sm" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Chambre</p>
              <p className="font-medium text-gray-900">
                {selectedRoom?.name || clientFile.selected_room_type?.name || <span className="text-orange-500">⚠️ Non attribuée</span>}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Prix total</p>
              <p className="text-lg font-bold text-gray-900">
                {clientFile.quoted_price != null ? `${Number(clientFile.quoted_price).toLocaleString('fr-FR')} €` : '—'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Voyageurs</p>
              <p className="font-medium text-gray-900">
                {clientFile.adults_count || 1} ad.
                {clientFile.children_count ? ` ${clientFile.children_count} enf.` : ''}
                {clientFile.babies_count ? ` ${clientFile.babies_count} bb.` : ''}
              </p>
            </div>
          </div>
        )}
      </div>

    </>
  )
}
