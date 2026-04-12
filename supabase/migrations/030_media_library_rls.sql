-- Autoriser les utilisateurs authentifiés à uploader dans media-library
-- (upload direct depuis le navigateur, bypass limite 4MB Next.js)

INSERT INTO storage.buckets (id, name, public)
VALUES ('media-library', 'media-library', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Politique : lecture publique
CREATE POLICY "media-library public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'media-library');

-- Politique : upload pour utilisateurs authentifiés
CREATE POLICY "media-library authenticated upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'media-library'
    AND auth.role() = 'authenticated'
  );

-- Politique : suppression pour utilisateurs authentifiés
CREATE POLICY "media-library authenticated delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'media-library'
    AND auth.role() = 'authenticated'
  );
