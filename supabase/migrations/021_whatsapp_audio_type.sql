-- Migration 021: Add 'audio' to valid_message_type constraint
ALTER TABLE whatsapp_messages DROP CONSTRAINT IF EXISTS valid_message_type;
ALTER TABLE whatsapp_messages ADD CONSTRAINT valid_message_type
  CHECK (message_type IN ('text', 'image', 'document', 'location', 'media', 'video', 'audio'));
