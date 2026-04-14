import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createSignatureRequest } from '@/lib/services/yousign.service'
import { prepareBalisesForGoogleDoc, generateBIFromGoogleDoc } from '@/lib/services/google-docs.service'
import { sendWhatsAppMessage } from '@/lib/services/whatsapp.service'

const serviceSupabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: biId } = await params
    const supabase = await createClient()

    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Récupérer le BI
    const { data: bi, error: biError } = await supabase
      .from('bulletin_inscriptions')
      .select('*')
      .eq('id', biId)
      .maybeSingle()

    if (biError || !bi) {
      return NextResponse.json({ error: 'BI non trouvé' }, { status: 404 })
    }

    const biData = bi.data as any
    const body = await request.json().catch(() => ({})) as { deliveryMode?: 'email' | 'whatsapp' }
    const deliveryMode: 'email' | 'whatsapp' = body.deliveryMode || 'email'

    // Email requis seulement pour livraison par email
    if (deliveryMode === 'email' && !biData.client?.email) {
      return NextResponse.json(
        { error: 'Email client requis pour la signature électronique' },
        { status: 400 }
      )
    }

    // Récupérer les infos WhatsApp du dossier si besoin
    const { data: clientFileWa } = await serviceSupabase
      .from('client_files')
      .select('primary_contact_phone, whatsapp_lid')
      .eq('id', bi.client_file_id)
      .maybeSingle()
    const waPhone = clientFileWa?.whatsapp_lid || clientFileWa?.primary_contact_phone || biData.client?.phone || ''

    // Générer le PDF du BI directement via Google Docs service
    const balises = prepareBalisesForGoogleDoc(biData)
    const fileLabel = `BI_${biData.file_reference || 'SANS_REF'}_${new Date().toISOString().slice(0, 10)}`

    let pdfBuffer: Buffer
    try {
      const result = await generateBIFromGoogleDoc(balises, fileLabel)
      pdfBuffer = result.pdfBuffer

      // Mettre à jour le BI avec le lien du document Google
      await supabase
        .from('bulletin_inscriptions')
        .update({
          google_doc_id: result.docId,
          google_doc_url: result.docUrl,
        })
        .eq('id', biId)
    } catch (pdfErr) {
      console.error('Erreur génération PDF:', pdfErr)
      return NextResponse.json(
        { error: `Erreur génération PDF: ${pdfErr instanceof Error ? pdfErr.message : 'Erreur inconnue'}` },
        { status: 500 }
      )
    }

    const fileName = `${fileLabel}.pdf`

    // Créer la signature request (upload + signer + activation en une seule fonction)
    const { signatureRequestId, documentId, signerUrl } = await createSignatureRequest({
      pdfBuffer,
      fileName,
      signerFirstName: biData.client.first_name,
      signerLastName: biData.client.last_name,
      signerEmail: biData.client.email || `noreply+${biData.file_reference}@clubturquoise.fr`,
      signerPhone: biData.client.phone || '',
      biNumber: biData.bi_number,
      deliveryMode: deliveryMode === 'whatsapp' ? 'none' : 'email',
    })

    // Si livraison WhatsApp : envoyer le lien de signature par WhatsApp
    if (deliveryMode === 'whatsapp' && waPhone && signerUrl) {
      const firstName = biData.client.first_name || 'Client'
      const message = `Bonjour ${firstName},\n\nVoici votre lien pour signer votre Bulletin d'Inscription Club Turquoise :\n\n${signerUrl}\n\nCordialement,\nAurélia`
      await sendWhatsAppMessage(waPhone, message).catch(err =>
        console.error('WhatsApp signature link send error:', err)
      )
    }

    // Mettre à jour le BI en base
    await supabase
      .from('bulletin_inscriptions')
      .update({
        client_signature_status: 'ongoing',
        signature_method: 'electronique',
        yousign_signature_request_id: signatureRequestId,
        yousign_document_id: documentId,
        yousign_signer_url: signerUrl,
      })
      .eq('id', biId)

    return NextResponse.json({
      success: true,
      signatureRequestId,
      signerUrl,
      message: 'Demande de signature envoyée. Le client peut signer via le lien.',
    })
  } catch (err) {
    console.error('Error requesting signature:', err)
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json(
      { error: `Erreur signature: ${message}` },
      { status: 500 }
    )
  }
}
