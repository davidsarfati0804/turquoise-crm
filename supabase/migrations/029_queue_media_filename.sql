-- Ajouter le nom de fichier pour les documents envoyés via WhatsApp
ALTER TABLE whatsapp_send_queue ADD COLUMN IF NOT EXISTS media_filename text;

COMMENT ON COLUMN whatsapp_send_queue.media_filename IS 'Nom du fichier pour les documents (ex: BI-Jean Dupont-Mariage 2026.pdf)';
