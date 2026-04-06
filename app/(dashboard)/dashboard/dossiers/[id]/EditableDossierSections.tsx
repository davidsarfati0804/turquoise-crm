'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Edit, Save, X, Phone, Mail } from 'lucide-react'

interface RoomType {
  id: string
  code: string
  name: string
}

interface Props {
  clientFile: any
  roomTypes: RoomType[]
}

export function EditableDossierSections({ clientFile, roomTypes }: Props) {
  const router = useRouter()
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Contact fields
  const [firstName, setFirstName] = useState(clientFile.primary_contact_first_name || '')
  const [lastName, setLastName] = useState(clientFile.primary_contact_last_name || '')
  const [phone, setPhone] = useState(clientFile.primary_contact_phone || '')
  const [email, setEmail] = useState(clientFile.primary_contact_email || '')

  // Commercial fields
  const [roomTypeId, setRoomTypeId] = useState(clientFile.selected_room_type_id || '')
  const [quotedPrice, setQuotedPrice] = useState(clientFile.quoted_price || '')
  const [adultsCount, setAdultsCount] = useState(clientFile.adults_count || 1)
  const [childrenCount, setChildrenCount] = useState(clientFile.children_count || 0)
  const [babiesCount, setBabiesCount] = useState(clientFile.babies_count || 0)

  const saveSection = async (section: string) => {
    setSaving(true)
    const supabase = createClient()

    let updateData: any = {}

    if (section === 'contact') {
      updateData = {
        primary_contact_first_name: firstName,
        primary_contact_last_name: lastName,
        primary_contact_phone: phone,
        primary_contact_email: email || null,
      }
    } else if (section === 'commercial') {
      const parsedPrice = quotedPrice ? parseFloat(quotedPrice) : null
      const amountPaid = clientFile.amount_paid || 0
      updateData = {
        selected_room_type_id: roomTypeId || null,
        quoted_price: parsedPrice,
        balance_due: parsedPrice != null ? Math.max(0, parsedPrice - amountPaid) : null,
        adults_count: adultsCount,
        children_count: childrenCount,
        babies_count: babiesCount,
        total_participants: adultsCount + childrenCount + babiesCount,
      }
    }

    const { error } = await supabase
      .from('client_files')
      .update(updateData)
      .eq('id', clientFile.id)

    if (error) {
      alert('Erreur: ' + error.message)
    } else {
      setEditingSection(null)
      router.refresh()
    }
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
    }
    setEditingSection(null)
  }

  const selectedRoom = roomTypes.find(rt => rt.id === roomTypeId)

  return (
    <>
      {/* Contact */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">👤 Contact</h2>
          {editingSection !== 'contact' ? (
            <button onClick={() => setEditingSection('contact')}
              className="text-gray-400 hover:text-turquoise-600 transition-colors" title="Modifier">
              <Edit className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex space-x-2">
              <button onClick={() => saveSection('contact')} disabled={saving}
                className="inline-flex items-center px-3 py-1 bg-turquoise-600 text-white text-xs rounded-lg hover:bg-turquoise-700 disabled:opacity-50">
                <Save className="w-3 h-3 mr-1" /> Sauver
              </button>
              <button onClick={() => cancelEdit('contact')}
                className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200">
                <X className="w-3 h-3 mr-1" /> Annuler
              </button>
            </div>
          )}
        </div>

        {editingSection === 'contact' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Prénom</label>
              <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent text-sm" />
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Nom</label>
              <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent text-sm" />
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Téléphone</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent text-sm" />
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent text-sm" />
            </div>
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
            {(clientFile.primary_contact_phone || clientFile.leads?.phone) && (
              <div>
                <p className="text-sm text-gray-500">Téléphone</p>
                <a href={`tel:${clientFile.primary_contact_phone || clientFile.leads?.phone}`}
                  className="flex items-center text-turquoise-600 hover:text-turquoise-700 font-medium">
                  <Phone className="w-4 h-4 mr-2" />
                  {clientFile.primary_contact_phone || clientFile.leads?.phone}
                </a>
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

      {/* Séjour (dates de l'événement) */}
      {clientFile.events && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">✈️ Séjour</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            {clientFile.events.check_in_time && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Check-in</p>
                <p className="font-medium text-gray-900">{clientFile.events.check_in_time?.substring(0, 5)}</p>
              </div>
            )}
            {clientFile.events.check_out_time && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Check-out</p>
                <p className="font-medium text-gray-900">{clientFile.events.check_out_time?.substring(0, 5)}</p>
              </div>
            )}
            {clientFile.events.nounou_included && (
              <div className="col-span-2">
                <p className="text-sm text-gray-500 mb-1">Nounou</p>
                <p className="font-medium text-green-600">✅ Incluse {clientFile.events.nounou_details ? `- ${clientFile.events.nounou_details}` : ''}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Commercial - inline editable */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">💼 Commercial</h2>
          {editingSection !== 'commercial' ? (
            <button onClick={() => setEditingSection('commercial')}
              className="text-gray-400 hover:text-turquoise-600 transition-colors" title="Modifier">
              <Edit className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex space-x-2">
              <button onClick={() => saveSection('commercial')} disabled={saving}
                className="inline-flex items-center px-3 py-1 bg-turquoise-600 text-white text-xs rounded-lg hover:bg-turquoise-700 disabled:opacity-50">
                <Save className="w-3 h-3 mr-1" /> Sauver
              </button>
              <button onClick={() => cancelEdit('commercial')}
                className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200">
                <X className="w-3 h-3 mr-1" /> Annuler
              </button>
            </div>
          )}
        </div>

        {editingSection === 'commercial' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Type de chambre</label>
                <select value={roomTypeId} onChange={e => setRoomTypeId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent text-sm">
                  <option value="">-- Non défini --</option>
                  {roomTypes.map(rt => (
                    <option key={rt.id} value={rt.id}>{rt.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Prix total (€)</label>
                <input type="number" step="0.01" min="0" value={quotedPrice}
                  onChange={e => setQuotedPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent text-sm" />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-2 block">Voyageurs</label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-400 block">Adultes</label>
                  <input type="number" min="1" value={adultsCount} onChange={e => setAdultsCount(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block">Enfants</label>
                  <input type="number" min="0" value={childrenCount} onChange={e => setChildrenCount(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block">Bébés</label>
                  <input type="number" min="0" value={babiesCount} onChange={e => setBabiesCount(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-turquoise-500 focus:border-transparent text-sm" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Chambre</p>
              <p className="font-medium text-gray-900">
                {selectedRoom?.name || clientFile.room_types?.name || <span className="text-orange-500">⚠️ Non attribuée</span>}
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

            <div>
              <p className="text-sm text-gray-500 mb-1">Montant payé</p>
              <p className="font-medium text-green-600">
                {clientFile.amount_paid ? `${clientFile.amount_paid.toLocaleString('fr-FR')} €` : '0 €'}
              </p>
            </div>

            {clientFile.quoted_price != null && (
              <div className="col-span-2">
                <p className="text-sm text-gray-500 mb-1">Solde restant</p>
                <p className="font-medium text-orange-600">
                  {((clientFile.quoted_price || 0) - (clientFile.amount_paid || 0)).toLocaleString('fr-FR')} €
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
