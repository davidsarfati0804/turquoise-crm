-- Fix: Apply RLS policies for WhatsApp tables
-- Run this if migration 010 was partially applied manually

-- ===== whatsapp_messages =====
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view whatsapp messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Only system can insert whatsapp messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Users can insert whatsapp messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Users can update message status" ON whatsapp_messages;

CREATE POLICY "Users can view whatsapp messages" ON whatsapp_messages
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert whatsapp messages" ON whatsapp_messages
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update message status" ON whatsapp_messages
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ===== whatsapp_conversations (if table exists) =====
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'whatsapp_conversations') THEN
    ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view whatsapp conversations" ON whatsapp_conversations;
    DROP POLICY IF EXISTS "Users can update conversations" ON whatsapp_conversations;

    CREATE POLICY "Users can view whatsapp conversations" ON whatsapp_conversations
      FOR SELECT USING (auth.role() = 'authenticated');

    CREATE POLICY "Users can update conversations" ON whatsapp_conversations
      FOR UPDATE USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- ===== whatsapp_response_templates (if table exists) =====
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'whatsapp_response_templates') THEN
    ALTER TABLE whatsapp_response_templates ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view response templates" ON whatsapp_response_templates;

    CREATE POLICY "Users can view response templates" ON whatsapp_response_templates
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;
