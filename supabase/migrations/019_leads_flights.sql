-- =====================================================
-- MIGRATION 019: VOLS SUR LES LEADS
-- =====================================================
-- Permet d'associer un vol aller/retour à un lead dès la création,
-- avant conversion en dossier. Les informations sont transférées
-- automatiquement lors de la conversion (ConvertToFileButton).

ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS flight_id_inbound UUID REFERENCES reference_flights(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS flight_id_outbound UUID REFERENCES reference_flights(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS flight_date_inbound DATE,
    ADD COLUMN IF NOT EXISTS flight_date_outbound DATE;

CREATE INDEX IF NOT EXISTS idx_leads_flight_inbound ON leads(flight_id_inbound);
CREATE INDEX IF NOT EXISTS idx_leads_flight_outbound ON leads(flight_id_outbound);
