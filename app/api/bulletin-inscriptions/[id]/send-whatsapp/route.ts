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

/** S'assure que le bucket bi-documents est public avant chaque upload */
async function ensureBiDocumentsBucket() {
  // Essayer de créer — si ça échoue (existe déjà), forcer la mise à jour en public
  const { error } = await serviceSupabase.storage.createBucket('bi-documents', {
    public: true,
    fileSizeLimit: 52428800,
  })
  if (error) {
    // Bucket existe déjà — forcer public via updateBucket
    await (serviceSupabase.storage as any).updateBucket('bi-documents', { public: true })
  }
}

/**
 * POST /api/bulletin-inscriptions/[id]/send-whatsapp
 * Génère le PDF, l'uploade dans le bucket public, et l'envoie comme document WhatsApp
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

    // ── Récupérer le BI ───────────────────────────────────────────────────────
    const { data: bi, error: biError } = await supabase
      .from('bulletin_inscriptions')
      .select(`*, client_files ( id, primary_contact_phone, whatsapp_lid )`)
      .eq('id', id)
      .maybeSingle()

    if (biError || !bi) {
      return NextResponse.json({ error: 'BI non trouvé' }, { status: 404 })
    }

    const biData     = bi.data
    const firstName  = biData?.client?.first_name || ''
    const lastName   = biData?.client?.last_name  || ''
    const eventName  = biData?.event?.name        || 'Evenement'
    const clientFileId = (bi as any).client_files?.id

    // Priorité d'envoi WhatsApp : whatsapp_lid > primary_contact_phone > biData phone
    const waLid    = (bi as any).client_files?.whatsapp_lid || ''
    const rawPhone = (bi as any).client_files?.primary_contact_phone || biData?.client?.phone || ''
    // phone = LID si disponible, sinon vrai numéro (jamais un LID depuis primary_contact_phone)
    const phone = waLid || (rawPhone.startsWith('lid:') ? '' : rawPhone)

    if (!phone) {
      return NextResponse.json({
        error: 'Aucun identifiant WhatsApp trouvé. Ajoute un numéro de téléphone dans le dossier.',
      }, { status: 400 })
    }

    // ── 1. Générer le PDF via Google Docs ─────────────────────────────────────
    const filename        = sanitizeFilename(`BI-${firstName} ${lastName}-${eventName}`) + '.pdf'
    const storageFilename = filename.replace(/\s+/g, '_')
    const storagePath     = `${id}/${storageFilename}`

    const balises = prepareBalisesForGoogleDoc(biData)
    const { pdfBuffer } = await generateBIFromGoogleDoc(balises, filename.replace('.pdf', ''))

    // ── 2. Upload dans le bucket public bi-documents ───────────────────────────
    await ensureBiDocumentsBucket()

    const { error: uploadError } = await serviceSupabase.storage
      .from('bi-documents')
      .upload(storagePath, new Uint8Array(pdfBuffer), {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: `Upload PDF échoué : ${uploadError.message}` }, { status: 500 })
    }

    // URL publique — NanoClaw télécharge ce fichier et l'envoie comme document WhatsApp
    const { data: publicData } = serviceSupabase.storage
      .from('bi-documents')
      .getPublicUrl(storagePath)

    const pdfUrl = publicData.publicUrl

    // ── 3. Envoyer comme document WhatsApp via NanoClaw ───────────────────────
    const result = await sendWhatsAppMedia(
      phone,
      pdfUrl,
      'document',
      undefined,       // pas de caption — le nom du fichier suffit
      undefined,
      clientFileId,
      filename,        // NanoClaw utilisera ce nom pour le fichier
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Erreur envoi WhatsApp' }, { status: 500 })
    }

    // ── 4. Mettre à jour le statut du BI ──────────────────────────────────────
    await supabase
      .from('bulletin_inscriptions')
      .update({ sent_via_whatsapp: true, whatsapp_sent_at: new Date().toISOString() })
      .eq('id', id)

    return NextResponse.json({ success: true, filename, pdfUrl })

  } catch (error) {
    console.error('Error sending BI via WhatsApp:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
