'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowRight } from 'lucide-react'

export function ConvertToFileButton({ lead }: { lead: any }) {
  const router = useRouter()
  const [converting, setConverting] = useState(false)

  // Extraire les voyageurs depuis le JSON encodé dans notes
  const parseVoyageurs = (notes: string | null): any[] => {
    if (!notes) return []
    const match = notes.match(/__VOYAGEURS_JSON__(.*?)__END_VOYAGEURS__/)
    if (!match) return []
    try {
      return JSON.parse(match[1])
    } catch {
      return []
    }
  }

  const handleConvert = async () => {
    if (!confirm(`Convertir ce lead en dossier client ?`)) return

    setConverting(true)
    const supabase = createClient()

    // Generate a unique file reference
    const now = new Date()
    const year = now.getFullYear()
    const rand = Math.floor(Math.random() * 9000) + 1000
    const prefix = (lead.first_name || 'X').substring(0, 1).toUpperCase() + (lead.last_name || 'X').substring(0, 2).toUpperCase()
    const fileReference = `${prefix}-${year}-${rand}`

    // Récupérer les voyageurs et calculer le prix total
    const voyageursData = parseVoyageurs(lead.notes)
    let quotedPrice = null

    if (lead.event_id) {
      // Charger l'événement pour nights_count
      const { data: event } = await supabase
        .from('events')
        .select('nights_count')
        .eq('id', lead.event_id)
        .single()

      const eventNights = event?.nights_count || 0

      if (eventNights > 0 && voyageursData.length > 0) {
        // Calculer le total à partir des chambres et dates individuelles
        const roomTypeIds = [...new Set(voyageursData.map((v: any) => v.room_type_id).filter(Boolean))]
        if (roomTypeIds.length > 0) {
          const { data: pricings } = await supabase
            .from('event_room_pricing')
            .select('room_type_id, price_per_night')
            .eq('event_id', lead.event_id)
            .in('room_type_id', roomTypeIds)

          const priceMap: Record<string, number> = {}
          for (const p of pricings || []) {
            priceMap[p.room_type_id] = p.price_per_night
          }

          let total = 0
          for (const v of voyageursData) {
            if (v.room_type_id && v.arrival_date && v.departure_date && priceMap[v.room_type_id]) {
              const nights = Math.max(0, Math.round((new Date(v.departure_date).getTime() - new Date(v.arrival_date).getTime()) / 86400000))
              const ppn = priceMap[v.room_type_id]
              total += ppn * nights
            }
          }
          if (total > 0) quotedPrice = Math.round(total * 100) / 100
        }
      }

      // Fallback: prix simple si pas de dates individuelles
      if (quotedPrice === null && lead.preferred_room_type_id) {
        const { data: pricing } = await supabase
          .from('event_room_pricing')
          .select('price_per_night')
          .eq('event_id', lead.event_id)
          .eq('room_type_id', lead.preferred_room_type_id)
          .single()
        quotedPrice = pricing?.price_per_night != null ? pricing.price_per_night * eventNights : null
      }
    }

    // Créer le dossier client
    const { data: clientFile, error: fileError } = await supabase
      .from('client_files')
      .insert([{
        lead_id: lead.id,
        event_id: lead.event_id,
        file_reference: fileReference,
        primary_contact_first_name: lead.first_name || '',
        primary_contact_last_name: lead.last_name || '',
        primary_contact_phone: lead.phone || '',
        primary_contact_email: lead.email || null,
        adults_count: lead.adults_count || 1,
        children_count: lead.children_count || 0,
        babies_count: lead.babies_count || 0,
        total_participants: (lead.adults_count || 1) + (lead.children_count || 0) + (lead.babies_count || 0),
        selected_room_type_id: lead.preferred_room_type_id || null,
        quoted_price: quotedPrice,
        balance_due: quotedPrice,
        crm_status: 'inscription_en_cours',
        payment_status: 'pending'
      }])
      .select()
      .single()

    if (fileError) {
      console.error('Error creating client file:', fileError)
      alert('Erreur lors de la conversion: ' + fileError.message)
      setConverting(false)
      return
    }

    // Créer les participants depuis les données voyageurs du lead
    if (voyageursData.length > 0) {
      const participants = voyageursData.map((v: any) => {
        const arrDate = v.arrival_date || null
        const depDate = v.departure_date || null
        let nights = null
        if (arrDate && depDate) {
          nights = Math.max(0, Math.round((new Date(depDate).getTime() - new Date(arrDate).getTime()) / 86400000))
        }
        return {
          client_file_id: clientFile.id,
          first_name: v.first_name || '',
          last_name: v.last_name || '',
          date_of_birth: v.date_of_birth || null,
          participant_type: v.type || 'adult',
          arrival_date: arrDate,
          departure_date: depDate,
          nights_count: nights,
          room_type_id: v.room_type_id || null,
        }
      })

      const { error: partError } = await supabase
        .from('participants')
        .insert(participants)

      if (partError) {
        console.error('Error creating participants:', partError)
      }
    }

    // Marquer le lead comme converti
    const { error: updateError } = await supabase
      .from('leads')
      .update({ converted_to_file_id: clientFile.id })
      .eq('id', lead.id)

    if (updateError) {
      console.error('Error updating lead:', updateError)
    }

    // Rediriger vers le dossier
    router.push(`/dashboard/dossiers/${clientFile.id}`)
    router.refresh()
  }

  return (
    <button
      onClick={handleConvert}
      disabled={converting}
      className="inline-flex items-center px-3 py-1.5 bg-turquoise-600 hover:bg-turquoise-700 text-white text-xs rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {converting ? 'Conversion...' : 'Convertir'}
      <ArrowRight className="w-3 h-3 ml-1" />
    </button>
  )
}
