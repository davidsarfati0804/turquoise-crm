-- Table d'exemples d'entraînement WhatsApp (few-shot learning)
-- Stocke des paires contexte/réponse extraites des vraies conversations
CREATE TABLE IF NOT EXISTS whatsapp_training_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT,
  context TEXT NOT NULL,        -- derniers messages avant la réponse agent
  agent_response TEXT NOT NULL, -- réponse agent validée
  topic TEXT,                   -- ex: 'devis', 'relance', 'nounous', 'tarif'
  source_file TEXT,             -- nom du fichier ZIP source
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE whatsapp_training_examples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read training examples"
  ON whatsapp_training_examples FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert training examples"
  ON whatsapp_training_examples FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Service role full access"
  ON whatsapp_training_examples FOR ALL TO service_role USING (true);
