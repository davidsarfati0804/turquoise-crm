-- =====================================================
-- MIGRATION 007: RENAME price_per_room TO price_per_night
-- =====================================================
-- Date: 2026-03-28
-- Description: Le prix des chambres est défini par nuit, pas par chambre (total séjour)

ALTER TABLE event_room_pricing
RENAME COLUMN price_per_room TO price_per_night;

COMMENT ON COLUMN event_room_pricing.price_per_night IS 'Prix par nuit pour ce type de chambre sur cet événement';
