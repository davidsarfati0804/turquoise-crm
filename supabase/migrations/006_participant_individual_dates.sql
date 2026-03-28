-- =====================================================
-- TURQUOISE CRM - DATES ET CHAMBRE INDIVIDUELLES PAR PARTICIPANT
-- =====================================================
-- Date: 2026-03-25
-- Description: Ajout des dates d'arrivée/départ et chambre par participant
--   Les voyageurs n'arrivent pas forcément tous en même temps

-- Dates individuelles par participant
ALTER TABLE participants
ADD COLUMN IF NOT EXISTS arrival_date DATE,
ADD COLUMN IF NOT EXISTS departure_date DATE,
ADD COLUMN IF NOT EXISTS nights_count INTEGER,
ADD COLUMN IF NOT EXISTS room_type_id UUID REFERENCES room_types(id);

COMMENT ON COLUMN participants.arrival_date IS 'Date d''arrivée individuelle du participant';
COMMENT ON COLUMN participants.departure_date IS 'Date de départ individuelle du participant';
COMMENT ON COLUMN participants.nights_count IS 'Nombre de nuits (calculé)';
COMMENT ON COLUMN participants.room_type_id IS 'Type de chambre attribué au participant';

CREATE INDEX IF NOT EXISTS idx_participants_room_type ON participants(room_type_id);
