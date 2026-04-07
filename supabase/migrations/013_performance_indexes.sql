-- ============================================================
-- 013: Index de performance critiques
-- ============================================================

-- whatsapp_messages : requêtes par numéro + tri date (le plus utilisé)
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone_date
  ON whatsapp_messages (wa_phone_number, created_at DESC);

-- whatsapp_messages : déduplication par wa_message_id
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_wa_id
  ON whatsapp_messages (wa_message_id)
  WHERE wa_message_id IS NOT NULL;

-- leads : filtrage leads non convertis (page leads)
CREATE INDEX IF NOT EXISTS idx_leads_not_converted
  ON leads (created_at DESC)
  WHERE converted_to_file_id IS NULL;

-- leads : recherche par téléphone (inbound WhatsApp)
CREATE INDEX IF NOT EXISTS idx_leads_phone
  ON leads (phone);

-- client_files : recherche par téléphone (inbound WhatsApp)
CREATE INDEX IF NOT EXISTS idx_client_files_phone
  ON client_files (primary_contact_phone);

-- client_files : tri par date de mise à jour (page dossiers)
CREATE INDEX IF NOT EXISTS idx_client_files_updated
  ON client_files (updated_at DESC);

-- bulletin_inscriptions : webhook yousign cherche par signature_request_id
CREATE INDEX IF NOT EXISTS idx_bi_yousign_request
  ON bulletin_inscriptions (yousign_signature_request_id)
  WHERE yousign_signature_request_id IS NOT NULL;

-- whatsapp_send_queue : déjà indexé en 012 mais s'assurer que pending est rapide
-- (déjà fait en 012_whatsapp_queue_and_ai_examples.sql)
