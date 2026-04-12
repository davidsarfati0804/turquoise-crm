import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage } from '@/lib/services/whatsapp.service'
import { prepareBalisesForGoogleDoc, generateBIFromGoogleDoc } from '@/lib/services/google-docs.service'

const serviceSupabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function sanitizeFilename(str: string): string {
  return str.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, ' ').trim()
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function buildBIMessage(biData: any, pdfUrl: string): string {
  const client = biData?.client || {}
  const event = biData?.event || {}
  const participants = biData?.participants || []
  const pricing = biData?.pricing || {}
  const roomType = biData?.room_type || {}

  const adults = biData?.adults_count || 0
  const children = biData?.children_count || 0
  const babies = biData?.babies_count || 0

  const compParts = [`${adults} adulte${adults > 1 ? 's' : ''}`]
  if (children > 0) compParts.push(`${children} enfant${children > 1 ? 's' : ''}`)
  if (babies > 0) compParts.push(`${babies} bébé${babies > 1 ? 's' : ''}`)

  const lines: string[] = [
    `📋 *BULLETIN D'INSCRIPTION*`,
    `Réf : ${biData?.file_reference || '—'}`,
    ``,
    `👤 *${client.first_name} ${client.last_name}*`,
    `📱 ${client.phone || '—'}`,
    client.email ? `✉️ ${client.email}` : '',
    ``,
    `🏝️ *SÉJOUR*`,
    `Événement : ${event.name || '—'}`,
    event.destination ? `Destination : ${event.destination}` : '',
    biData?.sejour_start_date ? `Arrivée : ${formatDate(biData.sejour_start_date)}` : '',
    biData?.sejour_end_date ? `Départ : ${formatDate(biData.sejour_end_date)}` : '',
    ``,
    `👥 *PARTICIPANTS* (${biData?.total_participants || adults + children + babies})`,
    compParts.join(' + '),
    participants.length > 0
      ? participants.map((p: any, i: number) => `${i + 1}. ${p.first_name} ${p.last_name}`).join('\n')
      : '',
    ``,
    `🛏️ *CHAMBRE*`,
    `${roomType.name || '—'}`,
    pricing.price_per_night ? `${pricing.price_per_night}€/nuit` : '',
    ``,
    `💰 *MONTANTS*`,
    biData?.quoted_price ? `Total : ${biData.quoted_price}€` : '',
    biData?.amount_paid ? `Payé : ${biData.amount_paid}€` : '',
    biData?.balance_due ? `Solde : *${biData.balance_due}€*` : '',
    ``,
    `📄 *Télécharger le PDF :*`,
    pdfUrl,
  ]

  return lines.filter(l => l !== '').join('\n')
}

/**
 * POST /api/bulletin-inscriptions/[id]/send-whatsapp
 * Génère le PDF, l'uploade en Storage public, et envoie via WhatsApp (text + lien)
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

    // Récupérer le BI
    const { data: bi, error: biError } = await supabase
      .from('bulletin_inscriptions')
      .select(`*, client_files ( id, primary_contact_phone )`)
      .eq('id', id)
      .maybeSingle()

    if (biError || !bi) {
      return NextResponse.json({ error: 'BI non trouvé' }, { status: 404 })
    }

    const biData = bi.data
    const firstName = biData?.client?.first_name || ''
    const lastName  = biData?.client?.last_name  || ''
    const eventName = biData?.event?.name        || 'Evenement'
    const phone     = (bi as any).client_files?.primary_contact_phone || biData?.client?.phone

    if (!phone) {
      return NextResponse.json({ error: 'Numéro de téléphone introuvable' }, { status: 400 })
    }

    const clientFileId = (bi as any).client_files?.id

    // ── 1. Générer le PDF via Google Docs ───────────────────────────────────
    const filename        = sanitizeFilename(`BI-${firstName} ${lastName}-${eventName}`) + '.pdf'
    const storageFilename = filename.replace(/\s+/g, '_')
    const storagePath     = `${id}/${storageFilename}`

    const balises = prepareBalisesForGoogleDoc(biData)
    const { pdfBuffer } = await generateBIFromGoogleDoc(balises, filename.replace('.pdf', ''))

    // ── 2. Upload dans Supabase Storage (bucket public) ─────────────────────
    await serviceSupabase.storage.createBucket('bi-documents', { public: true }).catch(() => {})

    await serviceSupabase.storage
      .from('bi-documents')
      .upload(storagePath, new Uint8Array(pdfBuffer), {
        contentType: 'application/pdf',
        upsert: true,
      })

    const { data: publicData } = serviceSupabase.storage
      .from('bi-documents')
      .getPublicUrl(storagePath)

    const pdfUrl = publicData.publicUrl

    // ── 3. Envoyer via WhatsApp comme message texte ──────────────────────────
    // NanoClaw gère uniquement text/image/video — on envoie le BI formaté + lien PDF.
    // Le lien PDF permet au client de télécharger le document directement.
    const message = buildBIMessage(biData, pdfUrl)

    const result = await sendWhatsAppMessage(
      phone,
      message,
      undefined,
      clientFileId,
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Erreur envoi WhatsApp' }, { status: 500 })
    }

    // ── 4. Mettre à jour le statut du BI ────────────────────────────────────
    await supabase
      .from('bulletin_inscriptions')
      .update({ sent_via_whatsapp: true, whatsapp_sent_at: new Date().toISOString() })
      .eq('id', id)

    // ── 5. Mettre à jour le message en base pour l'afficher comme document ──
    // On stocke le message_type='document' + media_url pour la bulle PDF dans l'inbox
    await serviceSupabase
      .from('whatsapp_messages')
      .update({ message_type: 'document', message_content: filename, metadata: { media_url: pdfUrl, provider: 'nanoclaw-ipc' } })
      .eq('wa_message_id', result.messageId || '')
      .neq('wa_message_id', '')

    return NextResponse.json({ success: true, filename, pdfUrl })

  } catch (error) {
    console.error('Error sending BI via WhatsApp:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
