import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { downloadSignedDocument } from '@/lib/services/yousign.service'

// Use service role for webhook (no user session)
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Yousign webhook handler
 * Called when signature status changes (signed, refused, expired)
 * 
 * Configure in Yousign dashboard:
 * URL: https://your-domain.com/api/webhooks/yousign
 * Events: signature_request.done, signature_request.declined, signature_request.expired
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const eventType = body.event_name
    const signatureRequestId = body.data?.signature_request?.id

    if (!signatureRequestId) {
      return NextResponse.json({ error: 'Missing signature_request id' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Find the BI linked to this signature request
    const { data: bi, error } = await supabase
      .from('bulletin_inscriptions')
      .select('*')
      .eq('yousign_signature_request_id', signatureRequestId)
      .single()

    if (error || !bi) {
      console.error('Webhook: BI not found for signature request', signatureRequestId)
      return NextResponse.json({ received: true, warning: 'BI not found' })
    }

    switch (eventType) {
      case 'signature_request.done': {
        // All signers have signed — download signed PDF
        let signedPdfUrl = null

        if (bi.yousign_document_id) {
          try {
            const signedPdf = await downloadSignedDocument(signatureRequestId, bi.yousign_document_id)
            
            // Store signed PDF in Supabase Storage (if bucket exists)
            const fileName = `signed_bi_${bi.bi_number}.pdf`
            const { data: uploadData } = await supabase.storage
              .from('documents')
              .upload(`signed-bis/${fileName}`, signedPdf, {
                contentType: 'application/pdf',
                upsert: true,
              })
            
            if (uploadData?.path) {
              const { data: urlData } = supabase.storage
                .from('documents')
                .getPublicUrl(uploadData.path)
              signedPdfUrl = urlData?.publicUrl || null
            }
          } catch (downloadErr) {
            console.error('Error downloading signed PDF:', downloadErr)
          }
        }

        await supabase
          .from('bulletin_inscriptions')
          .update({
            client_signature_status: 'signed',
            client_signed_at: new Date().toISOString(),
            ...(signedPdfUrl && { signed_pdf_url: signedPdfUrl }),
          })
          .eq('id', bi.id)

        console.log(`✅ BI ${bi.bi_number} signed successfully`)
        break
      }

      case 'signature_request.declined': {
        await supabase
          .from('bulletin_inscriptions')
          .update({ client_signature_status: 'refused' })
          .eq('id', bi.id)

        console.log(`❌ BI ${bi.bi_number} signature declined`)
        break
      }

      case 'signature_request.expired': {
        await supabase
          .from('bulletin_inscriptions')
          .update({ client_signature_status: 'expired' })
          .eq('id', bi.id)

        console.log(`⏰ BI ${bi.bi_number} signature expired`)
        break
      }

      default:
        console.log(`Yousign webhook event: ${eventType} (unhandled)`)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Yousign webhook error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
