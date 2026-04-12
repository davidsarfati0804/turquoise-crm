CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT DEFAULT 'general', -- 'invitation', 'relance', 'devis', 'general'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read" ON whatsapp_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write" ON whatsapp_templates FOR ALL TO authenticated USING (true);
CREATE POLICY "service full" ON whatsapp_templates FOR ALL TO service_role USING (true);

-- Template par défaut
INSERT INTO whatsapp_templates (name, category, content) VALUES (
  'Invitation mariage — chambres',
  'invitation',
  'Chers invités,

Nous vous remercions pour votre demande.
Le mariage de {{nom_maries}} se déroulera du {{date_debut}} au {{date_fin}}, la cérémonie aura lieu le {{date_ceremonie}}.
Nous nous chargeons de prendre les réservations de l''hôtel. Pour information, la restauration sera prise en charge par les mariés du {{date_debut}} au {{date_fin}}.

Nous vous proposons plusieurs catégories de chambres, je vous envoie la liste ci-dessous :

{{liste_chambres}}

Merci de nous indiquer vos noms, prénoms et votre composition familiale.
N''hésitez pas si vous avez besoin d''informations complémentaires 😉

Cordialement,
{{nom_agent}} - Club Turquoise'
);
