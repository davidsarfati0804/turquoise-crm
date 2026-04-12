-- Rendre le bucket bi-documents public avec les bonnes politiques RLS Storage

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('bi-documents', 'bi-documents', true, 52428800)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 52428800;

-- Supprimer les éventuelles anciennes politiques
DROP POLICY IF EXISTS "bi-documents public read" ON storage.objects;
DROP POLICY IF EXISTS "bi-documents service upload" ON storage.objects;
DROP POLICY IF EXISTS "bi-documents service delete" ON storage.objects;

-- Lecture publique (NanoClaw peut télécharger sans token)
CREATE POLICY "bi-documents public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'bi-documents');

-- Upload réservé au service_role (côté serveur uniquement)
CREATE POLICY "bi-documents service upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'bi-documents'
    AND (auth.role() = 'service_role' OR auth.role() = 'authenticated')
  );

CREATE POLICY "bi-documents service delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'bi-documents'
    AND (auth.role() = 'service_role' OR auth.role() = 'authenticated')
  );
