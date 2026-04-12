import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendWhatsAppMedia, MediaType } from '@/lib/services/whatsapp.service'

const serviceSupabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

/**
 * POST /api/whatsapp/send-media
 *
 * Two modes:
 * 1. FormData  — file upload from disk (field "file" + "phoneNumber" + optional "clientFileId")
 * 2. JSON      — media already hosted (fields "mediaUrl" + "mediaType" + "phoneNumber" + optional "caption" + "clientFileId")
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
  }

  const contentType = req.headers.get('content-type') || ''

  // ── Mode 1 : upload de fichier (FormData) ─────────────────────────────────
  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const phoneNumber = form.get('phoneNumber') as string | null
    const clientFileId = form.get('clientFileId') as string | null

    if (!file || !phoneNumber) {
      return NextResponse.json({ success: false, error: 'file et phoneNumber requis' }, { status: 400 })
    }

    // Upload dans le bucket media-library / direct-sends
    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const storagePath = `direct-sends/${safeName}`

    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadError } = await serviceSupabase.storage
      .from('media-library')
      .upload(storagePath, new Uint8Array(arrayBuffer), {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ success: false, error: `Upload échoué : ${uploadError.message}` }, { status: 500 })
    }

    const { data: publicData } = serviceSupabase.storage
      .from('media-library')
      .getPublicUrl(storagePath)

    const mediaUrl = publicData.publicUrl

    const mediaType: MediaType =
      file.type.startsWith('video') ? 'video' :
      file.type === 'application/pdf' ? 'document' :
      'image'

    const result = await sendWhatsAppMedia(
      phoneNumber,
      mediaUrl,
      mediaType,
      undefined,
      undefined,
      clientFileId ?? undefined,
      file.name,
    )

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, mediaUrl, mediaType })
  }

  // ── Mode 2 : URL déjà hébergée (JSON) ─────────────────────────────────────
  let body: {
    phoneNumber?: string
    mediaUrl?: string
    mediaType?: string
    caption?: string
    clientFileId?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Body invalide' }, { status: 400 })
  }

  const { phoneNumber, mediaUrl, mediaType, caption, clientFileId } = body

  if (!phoneNumber || !mediaUrl || !mediaType) {
    return NextResponse.json({ success: false, error: 'phoneNumber, mediaUrl et mediaType requis' }, { status: 400 })
  }

  const result = await sendWhatsAppMedia(
    phoneNumber,
    mediaUrl,
    mediaType as MediaType,
    caption,
    undefined,
    clientFileId,
  )

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
