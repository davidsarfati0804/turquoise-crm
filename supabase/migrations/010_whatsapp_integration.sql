-- WhatsApp Business API Integration Tables

-- 1. Main WhatsApp messages table (with AI extraction & intelligent response)
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- WhatsApp identifiers
  wa_message_id TEXT UNIQUE NOT NULL,           -- Unique message ID from WhatsApp API
  wa_phone_number TEXT NOT NULL,                 -- Client phone (format: 33612345678)
  wa_display_name TEXT,                          -- Client display name from WhatsApp profile
  
  -- CRM entity links
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  client_file_id UUID REFERENCES client_files(id) ON DELETE SET NULL,
  
  -- Message content
  message_type TEXT NOT NULL DEFAULT 'text',     -- 'text', 'image', 'document', 'media', 'video'
  message_content TEXT NOT NULL,                 -- Message text/content
  media_url TEXT,                                -- URL to image/PDF/document
  media_mime_type TEXT,                          -- MIME type (application/pdf, image/jpeg, etc)
  
  -- Direction and delivery
  direction TEXT NOT NULL,                       -- 'inbound' or 'outbound'
  delivery_status TEXT DEFAULT 'delivered',      -- 'sent', 'delivered', 'read', 'failed'
  
  -- ===== NEW: AI-Powered Extraction & Intelligence =====
  -- Extracted information from message content
  extracted_data JSONB DEFAULT '{}',             -- Extracted fields:
                                                  -- {
                                                  --   "adults_count": 2,
                                                  --   "children_count": 1,
                                                  --   "babies_count": 0,
                                                  --   "names": ["Jean", "Marie"],
                                                  --   "desired_room_types": ["double", "single"],
                                                  --   "nights_requested": 5,
                                                  --   "travel_dates": {"start": "2026-04-01", "end": "2026-04-06"},
                                                  --   "budget": 1500,
                                                  --   "destination": "Bali",
                                                  --   "occasion": "mariage",
                                                  --   "event_name_mentioned": "mariage de Rudy",
                                                  --   "missing_fields": ["email", "room_preference"]
                                                  -- }
  
  -- Suggested response from AI
  suggested_response TEXT,                       -- AI-generated response (user must validate)
  suggested_response_questions TEXT[],           -- Priority questions to ask ({:}[ 
                                                  -- "Combien de personnes au total?",
                                                  -- "Quel type de chambre souhaitez-vous?"
                                                  -- ])
  
  -- Event detection
  detected_event_id UUID REFERENCES events(id) ON DELETE SET NULL,  -- If event mentioned
  event_detection_confidence FLOAT DEFAULT 0,   -- Confidence score 0-1
  
  -- Validation & feedback (for learning)
  extraction_validated BOOLEAN DEFAULT FALSE,   -- Did agent validate extraction?
  response_validated BOOLEAN DEFAULT FALSE,     -- Did agent accept suggested response?
  agent_feedback JSONB DEFAULT '{}',            -- Agent corrections/feedback
  
  -- Processing status
  processing_status TEXT DEFAULT 'pending',     -- 'pending', 'processing', 'completed', 'failed'
  processing_error TEXT,                        -- Error if extraction failed
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',                  -- Store extra WhatsApp API data
  
  CONSTRAINT valid_direction CHECK (direction IN ('inbound', 'outbound')),
  CONSTRAINT valid_message_type CHECK (message_type IN ('text', 'image', 'document', 'location', 'media', 'video')),
  CONSTRAINT valid_processing_status CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Indexes for performance
CREATE INDEX idx_whatsapp_messages_phone ON whatsapp_messages(wa_phone_number);
CREATE INDEX idx_whatsapp_messages_lead_id ON whatsapp_messages(lead_id);
CREATE INDEX idx_whatsapp_messages_file_id ON whatsapp_messages(client_file_id);
CREATE INDEX idx_whatsapp_messages_created_at ON whatsapp_messages(created_at DESC);
CREATE INDEX idx_whatsapp_messages_direction ON whatsapp_messages(direction);
CREATE INDEX idx_whatsapp_messages_processing_status ON whatsapp_messages(processing_status);
CREATE INDEX idx_whatsapp_messages_extraction_validated ON whatsapp_messages(extraction_validated);
CREATE INDEX idx_whatsapp_messages_detected_event ON whatsapp_messages(detected_event_id);

-- 2. Conversation tracking table (optional but useful for grouping)
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  wa_phone_number TEXT NOT NULL UNIQUE,         -- One conversation per phone number
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  client_file_id UUID REFERENCES client_files(id) ON DELETE SET NULL,
  
  last_message_at TIMESTAMP,
  message_count INT DEFAULT 0,
  unread_count INT DEFAULT 0,
  status TEXT DEFAULT 'active',                 -- 'active', 'archived', 'closed'
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_conversations_phone ON whatsapp_conversations(wa_phone_number);
CREATE INDEX idx_whatsapp_conversations_lead_id ON whatsapp_conversations(lead_id);
CREATE INDEX idx_whatsapp_conversations_file_id ON whatsapp_conversations(client_file_id);
CREATE INDEX idx_whatsapp_conversations_status ON whatsapp_conversations(status);

-- 3. Learning tracker - for improving AI extraction over time
CREATE TABLE IF NOT EXISTS whatsapp_extraction_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  message_id UUID NOT NULL REFERENCES whatsapp_messages(id) ON DELETE CASCADE,
  
  -- What was extracted and what was corrected
  original_extraction JSONB NOT NULL,           -- Original AI extraction
  corrected_extraction JSONB NOT NULL,          -- What agent corrected to
  corrections JSONB DEFAULT '{}',               -- Which fields were corrected
  
  -- Feedback
  extraction_accuracy_score INT,                -- 1-5 star rating
  notes TEXT,                                   -- Agent notes on corrections
  
  -- For ML training
  feedback_type TEXT DEFAULT 'correction',      -- 'correction', 'validation', 'rejection'
  processed BOOLEAN DEFAULT FALSE,              -- Has this been used for training yet?
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_extraction_feedback_message ON whatsapp_extraction_feedback(message_id);
CREATE INDEX idx_extraction_feedback_processed ON whatsapp_extraction_feedback(processed);

-- 4. Event name aliases for better detection (e.g., "mariage de Rudy" → event_id 123)
CREATE TABLE IF NOT EXISTS event_name_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  
  -- Various ways people might refer to this event
  alias_name TEXT NOT NULL,                     -- "mariage de Rudy", "Rudy's wedding", etc
  alias_type TEXT DEFAULT 'user_provided',      -- 'system', 'user_provided', 'auto_detected'
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_alias UNIQUE (event_id, alias_name)
);

CREATE INDEX idx_event_aliases_event ON event_name_aliases(event_id);
CREATE INDEX idx_event_aliases_name ON event_name_aliases(alias_name);

-- 5. Quick reply templates for fast responses
CREATE TABLE IF NOT EXISTS whatsapp_response_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name TEXT NOT NULL,                            -- Template name (for admin)
  content TEXT NOT NULL,                         -- Template text to send
  category TEXT DEFAULT 'general',               -- 'greeting', 'confirmation', 'followup', 'general'
  description TEXT,
  
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_template_name UNIQUE (name)
);

-- Seed default response templates
INSERT INTO whatsapp_response_templates (name, content, category, description) VALUES
  ('greeting', 'Bonjour 👋 Merci de nous contacter! Comment pouvons-nous vous aider?', 'greeting', 'Initial greeting'),
  ('confirmation', 'Merci pour votre message. Nous revenons vers vous très rapidement! 🙏', 'confirmation', 'Acknowledge receipt'),
  ('info_request', 'Pourriez-vous nous donner plus de détails? (nombre de personnes, dates, type de chambre...)', 'followup', 'Request more info'),
  ('availability_check', 'Laissez-moi vérifier nos disponibilités pour ces dates...', 'general', 'Checking availability'),
  ('unavailable', 'Nous sommes actuellement indisponibles, mais nous vous répondrons dès que possible.', 'general', 'Out of office'),
  ('pricing', 'Pour plus d''informations sur nos tarifs, veuillez nous contacter directement.', 'general', 'Pricing inquiry')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS on whatsapp tables
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_response_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_extraction_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_name_aliases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_messages (only authenticated users can see)
CREATE POLICY "Users can view whatsapp messages" ON whatsapp_messages
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only system can insert whatsapp messages" ON whatsapp_messages
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update message status" ON whatsapp_messages
  FOR UPDATE USING (auth.role() = 'authenticated');

-- RLS Policies for whatsapp_conversations
CREATE POLICY "Users can view whatsapp conversations" ON whatsapp_conversations
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update conversations" ON whatsapp_conversations
  FOR UPDATE USING (auth.role() = 'authenticated');

-- RLS Policies for response templates (view only)
CREATE POLICY "Users can view response templates" ON whatsapp_response_templates
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for extraction feedback
CREATE POLICY "Users can view extraction feedback" ON whatsapp_extraction_feedback
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create extraction feedback" ON whatsapp_extraction_feedback
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update extraction feedback" ON whatsapp_extraction_feedback
  FOR UPDATE USING (auth.role() = 'authenticated');

-- RLS Policies for event aliases
CREATE POLICY "Users can view event aliases" ON event_name_aliases
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create event aliases" ON event_name_aliases
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can delete own event aliases" ON event_name_aliases
  FOR DELETE USING (auth.role() = 'authenticated');
