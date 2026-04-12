-- Augmenter la limite de taille des fichiers dans media-library à 200MB
UPDATE storage.buckets
SET file_size_limit = 209715200  -- 200 MB en octets
WHERE id = 'media-library';

-- Si le bucket n'existe pas encore, l'insérer avec la bonne limite
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('media-library', 'media-library', true, 209715200)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 209715200;
