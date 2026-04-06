import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'whatsapp-media';
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function getMediaType(mimeType: string): 'image' | 'video' | 'document' | 'audio' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
}

/**
 * POST /api/whatsapp/upload
 * Accept a file (multipart/form-data), upload to Supabase Storage, return public URL.
 * Requires authenticated session.
 */
export async function POST(req: NextRequest) {
  // Require auth session
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'Missing file field' }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 50 MB)' }, { status: 413 });
  }

  const mimeType = file.type || 'application/octet-stream';
  const mediaType = getMediaType(mimeType);
  const originalName = (file as File).name || 'upload';
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${user.id}/${Date.now()}_${safeName}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Ensure bucket exists (create if not, public)
  const { error: bucketError } = await supabaseAdmin.storage.createBucket(BUCKET, {
    public: true,
    allowedMimeTypes: ['image/*', 'video/*', 'audio/*', 'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    fileSizeLimit: MAX_SIZE_BYTES,
  });
  // Ignore error if bucket already exists (code 409 / BucketAlreadyExists)
  if (bucketError && !bucketError.message.includes('already exists') && bucketError.message !== 'The resource already exists') {
    console.warn('[whatsapp/upload] bucket create warning:', bucketError.message);
  }

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: mimeType, upsert: false });

  if (uploadError) {
    console.error('[whatsapp/upload] upload error:', uploadError);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicUrlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath);
  const url = publicUrlData?.publicUrl;

  if (!url) {
    return NextResponse.json({ error: 'Failed to get public URL' }, { status: 500 });
  }

  return NextResponse.json({ url, mediaType, mimeType, originalName });
}
