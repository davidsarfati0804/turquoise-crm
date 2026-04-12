import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendWhatsAppMedia } from '@/lib/services/whatsapp.service'
import { prepareBalisesForGoogleDoc, generateBIFromGoogleDoc } from '@/lib/services/google-docs.service'

const serviceSupabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function sanitizeFilename(str: string): string {
  return str.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, ' ').trim()
}

/**
 * POST /api/bulletin-inscriptions/[id]/send-whatsapp
 * Génère le PDF du BI, l'uploade en Storage, et l'envoie via WhatsApp CRM
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Récupérer le BI avec le dossier client
    const { data: bi, error: biError } = await supabase
      .from('bulletin_inscriptions')
      .select(`
        *,
        client_files (
          id,
          primary_contact_phone
        )
      `)
      .eq('id', id)
      .maybeSingle()

    if (biError || !bi) {
      return NextResponse.json({ error: 'Bulletin d\'inscription non trouvé' }, { status: 404 })
    }

    const biData = bi.data
    const firstName = biData?.client?.first_name || ''
    const lastName = biData?.client?.last_name || ''
    const eventName = biData?.event?.name || 'Evenement'
    const phone = (bi as any).client_files?.primary_contact_phone || biData?.client?.phone

    if (!phone) {
      return NextResponse.json({ error: 'Numéro de téléphone introuvable sur ce dossier' }, { status: 400 })
    }

    // Construire le nom de fichier : BI-Prénom Nom-Événement.pdf
    const filename = sanitizeFilename(`BI-${firstName} ${lastName}-${eventName}`) + '.pdf'

    // Générer le PDF via Google Docs
    const balises = prepareBalisesForGoogleDoc(biData)
    const { pdfBuffer } = await generateBIFromGoogleDoc(balises, filename.replace('.pdf', ''))

    // Uploader dans Supabase Storage (bucket public bi-documents)
    // Le bucket doit être PUBLIC pour que NanoClaw reçoive une URL propre sans token JWT
    const storagePath = `${id}/${filename}`

    // Créer le bucket public s'il n'existe pas
    await serviceSupabase.storage.createBucket('bi-documents', { public: true }).catch(() => {})

    const { error: uploadError } = await serviceSupabase.storage
      .from('bi-documents')
      .upload(storagePath, new Uint8Array(pdfBuffer), {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: `Erreur upload PDF: ${uploadError.message}` }, { status: 500 })
    }

    // URL publique propre (sans token) — NanoClaw peut la télécharger directement
    const { data: publicData } = serviceSupabase.storage
      .from('bi-documents')
      .getPublicUrl(storagePath)

    const mediaUrl = publicData.publicUrl

    // Envoyer via WhatsApp (queued via NanoClaw IPC)
    const clientFileId = (bi as any).client_files?.id
    const result = await sendWhatsAppMedia(
      phone,
      mediaUrl,
      'document',
      filename.replace('.pdf', ''),
      undefined,
      clientFileId,
      filename,
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Erreur lors de l\'envoi' }, { status: 500 })
    }

    // Mettre à jour le statut du BI
    await supabase
      .from('bulletin_inscriptions')
      .update({
        sent_via_whatsapp: true,
        whatsapp_sent_at: new Date().toISOString(),
      })
      .eq('id', id)

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      filename,
    })
  } catch (error) {
    console.error('Error sending BI via WhatsApp:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
