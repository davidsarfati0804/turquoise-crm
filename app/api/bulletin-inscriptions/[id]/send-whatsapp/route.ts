import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendBIWhatsApp } from '@/lib/services/whatsapp.service'

/**
 * POST /api/bulletin-inscriptions/[id]/send-whatsapp
 * Envoie un BI via WhatsApp
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Récupérer le BI
    const { data: bi, error: biError } = await supabase
      .from('bulletin_inscriptions')
      .select(`
        *,
        client_files (
          primary_contact_phone
        )
      `)
      .eq('id', id)
      .single()

    if (biError || !bi) {
      return NextResponse.json(
        { error: 'Bulletin d\'inscription non trouvé' },
        { status: 404 }
      )
    }

    // Envoyer via WhatsApp
    const result = await sendBIWhatsApp({
      phone: bi.data.client.phone,
      clientName: `${bi.data.client.first_name} ${bi.data.client.last_name}`,
      eventName: bi.data.event.name,
      biNumber: bi.bi_number,
      fileReference: bi.data.file_reference,
      biData: bi.data
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Erreur lors de l\'envoi' },
        { status: 500 }
      )
    }

    // Mettre à jour le statut
    await supabase
      .from('bulletin_inscriptions')
      .update({
        sent_via_whatsapp: true,
        whatsapp_sent_at: new Date().toISOString()
      })
      .eq('id', id)

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      whatsappUrl: result.whatsappUrl
    })
  } catch (error) {
    console.error('Error sending WhatsApp:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
