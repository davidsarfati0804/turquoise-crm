import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const BUCKET = 'media-library';

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find(b => b.name === BUCKET)) {
    await supabase.storage.createBucket(BUCKET, { public: true });
  }
}

/** GET /api/whatsapp/media-library?folder=chambres */
export async function GET(req: NextRequest) {
  const folder = req.nextUrl.searchParams.get('folder') || '';
  await ensureBucket();

  const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
    limit: 200,
    sortBy: { column: 'created_at', order: 'desc' },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const files = (data ?? [])
    .filter(f => f.name !== '.emptyFolderPlaceholder' && !f.id?.endsWith('/'))
    .map(f => {
      const path = folder ? `${folder}/${f.name}` : f.name;
      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      const type = ['mp4', 'mov', 'avi', 'webm'].includes(ext) ? 'video'
        : ['pdf', 'doc', 'docx'].includes(ext) ? 'document'
        : 'image';
      return { name: f.name, path, url: publicUrl, type, size: f.metadata?.size };
    });

  // Lister aussi les sous-dossiers si on est à la racine
  let folders: string[] = [];
  if (!folder) {
    const allItems = data ?? [];
    folders = allItems.filter(f => !f.id).map(f => f.name);
  }

  return NextResponse.json({ files, folders });
}

/** POST /api/whatsapp/media-library — upload un fichier */
export async function POST(req: NextRequest) {
  await ensureBucket();
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const folder = (formData.get('folder') as string) || 'general';
  if (!file) return NextResponse.json({ error: 'Fichier requis' }, { status: 400 });

  const ext = file.name.split('.').pop();
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const path = `${folder}/${safeName}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ ok: true, url: publicUrl, path });
}

/** PATCH /api/whatsapp/media-library — renommer un fichier */
export async function PATCH(req: NextRequest) {
  const body = await req.json() as { oldPath: string; newName: string };
  const { oldPath, newName } = body;
  if (!oldPath || !newName) return NextResponse.json({ error: 'oldPath et newName requis' }, { status: 400 });

  // Extraire le dossier depuis l'ancien chemin
  const parts = oldPath.split('/');
  const folder = parts.slice(0, -1).join('/');
  const ext = oldPath.split('.').pop() || '';
  const safeName = newName.replace(/[^a-zA-Z0-9._\-\s]/g, '_').trim();
  const newPath = folder ? `${folder}/${safeName}` : safeName;

  // Télécharger le fichier existant
  const { data: fileData, error: downloadError } = await supabase.storage.from(BUCKET).download(oldPath);
  if (downloadError || !fileData) return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 });

  // Re-uploader avec le nouveau nom
  const arrayBuffer = await fileData.arrayBuffer();
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(newPath, arrayBuffer, {
    contentType: fileData.type,
    upsert: false,
  });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  // Supprimer l'ancien fichier
  await supabase.storage.from(BUCKET).remove([oldPath]);

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(newPath);
  return NextResponse.json({ ok: true, path: newPath, url: publicUrl, name: safeName });
}

/** DELETE /api/whatsapp/media-library?path=folder/file.jpg */
export async function DELETE(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path');
  if (!path) return NextResponse.json({ error: 'path requis' }, { status: 400 });
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
