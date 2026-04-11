-- Migration 022: Renommer leads.status → leads.crm_status
-- Le code WhatsApp/CRM utilise crm_status partout, mais la colonne
-- originale s'appelait status. Ce rename aligne DB et code.

ALTER TABLE leads RENAME COLUMN status TO crm_status;

-- Recréer l'index avec le bon nom de colonne
DROP INDEX IF EXISTS idx_leads_status;
CREATE INDEX IF NOT EXISTS idx_leads_crm_status ON leads(crm_status);
