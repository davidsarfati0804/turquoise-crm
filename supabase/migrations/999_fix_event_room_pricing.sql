-- Correction ultime pour la table event_room_pricing
-- À exécuter dans Supabase SQL Editor

-- 1. Renommer price_per_person ou price_per_room en price_per_night si besoin
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_room_pricing' AND column_name = 'price_per_person'
    ) THEN
        ALTER TABLE event_room_pricing RENAME COLUMN price_per_person TO price_per_night;
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_room_pricing' AND column_name = 'price_per_room'
    ) THEN
        ALTER TABLE event_room_pricing RENAME COLUMN price_per_room TO price_per_night;
    END IF;
END $$;

-- 2. Supprimer la colonne deposit_amount si elle existe
ALTER TABLE event_room_pricing DROP COLUMN IF EXISTS deposit_amount;

-- 3. S'assurer que price_per_night existe et est du bon type
ALTER TABLE event_room_pricing ALTER COLUMN price_per_night TYPE DECIMAL(10,2) USING price_per_night::DECIMAL(10,2);
ALTER TABLE event_room_pricing ALTER COLUMN price_per_night SET NOT NULL;

-- 4. Ajouter un commentaire explicite
COMMENT ON COLUMN event_room_pricing.price_per_night IS 'Prix par nuit pour ce type de chambre sur cet événement';

-- 5. Vérifier la contrainte unique
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'event_room_pricing' AND constraint_type = 'UNIQUE' AND constraint_name LIKE '%event_id%room_type_id%'
    ) THEN
        ALTER TABLE event_room_pricing ADD CONSTRAINT event_room_pricing_event_id_room_type_id_key UNIQUE (event_id, room_type_id);
    END IF;
END $$;
