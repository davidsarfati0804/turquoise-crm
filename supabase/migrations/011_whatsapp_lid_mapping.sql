-- =====================================================
-- 011 : WhatsApp LID preservation
-- Quand un LID est remplacé par un vrai numéro de téléphone,
-- on conserve le LID dans whatsapp_lid pour continuer à matcher
-- les messages entrants qui utilisent encore ce LID.
-- =====================================================

-- 1. Colonnes
ALTER TABLE leads ADD COLUMN IF NOT EXISTS whatsapp_lid VARCHAR(100);
ALTER TABLE client_files ADD COLUMN IF NOT EXISTS whatsapp_lid VARCHAR(100);

-- 2. Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp_lid ON leads(whatsapp_lid);
CREATE INDEX IF NOT EXISTS idx_client_files_whatsapp_lid ON client_files(whatsapp_lid);

-- 3. Trigger sur leads :
--    Si phone passe de "lid:XXX" à un vrai numéro → sauvegarde le LID
CREATE OR REPLACE FUNCTION preserve_whatsapp_lid_leads()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.phone LIKE 'lid:%' AND NEW.phone NOT LIKE 'lid:%' THEN
    NEW.whatsapp_lid := OLD.phone;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leads_preserve_lid ON leads;
CREATE TRIGGER trg_leads_preserve_lid
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION preserve_whatsapp_lid_leads();

-- 4. Trigger sur client_files :
--    Si primary_contact_phone passe de "lid:XXX" à un vrai numéro → sauvegarde le LID
CREATE OR REPLACE FUNCTION preserve_whatsapp_lid_files()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.primary_contact_phone LIKE 'lid:%' AND NEW.primary_contact_phone NOT LIKE 'lid:%' THEN
    NEW.whatsapp_lid := OLD.primary_contact_phone;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_client_files_preserve_lid ON client_files;
CREATE TRIGGER trg_client_files_preserve_lid
  BEFORE UPDATE ON client_files
  FOR EACH ROW EXECUTE FUNCTION preserve_whatsapp_lid_files();
