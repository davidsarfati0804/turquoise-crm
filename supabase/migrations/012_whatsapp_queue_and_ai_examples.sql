-- ============================================================
-- 012: WhatsApp send queue (Supabase-based IPC) + AI examples
-- ============================================================

-- Queue de messages à envoyer via NanoClaw
-- NanoClaw poll cette table et envoie les messages pending
CREATE TABLE IF NOT EXISTS whatsapp_send_queue (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_jid      text        NOT NULL,
  message_type  text        NOT NULL DEFAULT 'text', -- text | image | video | document | audio
  message_text  text,
  media_url     text,
  media_caption text,
  status        text        NOT NULL DEFAULT 'pending', -- pending | processing | sent | failed
  error_message text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  processed_at  timestamptz
);

-- Index pour que NanoClaw trouve rapidement les pending
CREATE INDEX IF NOT EXISTS whatsapp_send_queue_status_idx
  ON whatsapp_send_queue (status, created_at);

-- RLS : service_role uniquement (NanoClaw + CRM server-side)
ALTER TABLE whatsapp_send_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON whatsapp_send_queue
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- Exemples de bonnes réponses IA (apprentissage few-shot)
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_ai_examples (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_context text        NOT NULL, -- derniers messages (contexte)
  good_response        text        NOT NULL, -- réponse validée/envoyée
  contact_name         text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_ai_examples_created_idx
  ON whatsapp_ai_examples (created_at DESC);

ALTER TABLE whatsapp_ai_examples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON whatsapp_ai_examples
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "authenticated_read" ON whatsapp_ai_examples
  FOR SELECT USING (auth.role() = 'authenticated');
