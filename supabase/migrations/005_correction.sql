-- =====================================================
-- TURQUOISE CRM - CORRECTION MIGRATION 005
-- =====================================================
-- Date: 2026-03-23
-- Description: Termine l'application de la SECTION 1 qui n'a pas été exécutée
-- Ce script contient uniquement les parties manquantes de la migration 005

-- =====================================================
-- SECTION 1: CORRECTIONS FROM MIGRATION 004 (MANQUANTES)
-- =====================================================

-- 1.1 Remove unused columns from EVENTS table
-- Note: Ces colonnes existent encore dans votre base
ALTER TABLE events 
DROP COLUMN IF EXISTS description,
DROP COLUMN IF EXISTS hotel_name;

COMMENT ON TABLE events IS 'Événements/Offres de voyage - description et hotel supprimés (inutiles)';

-- 1.2 Rename price_per_person to price_per_room (prix par chambre, pas par personne)
-- Note: Cette colonne n'a pas encore été renommée
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_room_pricing' 
        AND column_name = 'price_per_person'
    ) THEN
        ALTER TABLE event_room_pricing 
        RENAME COLUMN price_per_person TO price_per_room;
        
        RAISE NOTICE '✅ Colonne price_per_person renommée en price_per_room';
    ELSE
        RAISE NOTICE '⚠️  Colonne price_per_person déjà renommée ou inexistante';
    END IF;
END $$;

COMMENT ON COLUMN event_room_pricing.price_per_room IS 'Prix par chambre (pas par personne)';

-- 1.3 Remove deposit_amount from event_room_pricing (not needed)
ALTER TABLE event_room_pricing 
DROP COLUMN IF EXISTS deposit_amount;

-- =====================================================
-- VÉRIFICATION
-- =====================================================

-- Vérifier que les colonnes ont bien été supprimées/renommées
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Vérifier que description n'existe plus
    SELECT COUNT(*) INTO v_count
    FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'description';
    
    IF v_count = 0 THEN
        RAISE NOTICE '✅ events.description supprimée';
    ELSE
        RAISE NOTICE '❌ events.description existe encore';
    END IF;

    -- Vérifier que hotel_name n'existe plus
    SELECT COUNT(*) INTO v_count
    FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'hotel_name';
    
    IF v_count = 0 THEN
        RAISE NOTICE '✅ events.hotel_name supprimée';
    ELSE
        RAISE NOTICE '❌ events.hotel_name existe encore';
    END IF;

    -- Vérifier que price_per_room existe
    SELECT COUNT(*) INTO v_count
    FROM information_schema.columns
    WHERE table_name = 'event_room_pricing' AND column_name = 'price_per_room';
    
    IF v_count > 0 THEN
        RAISE NOTICE '✅ event_room_pricing.price_per_room existe';
    ELSE
        RAISE NOTICE '❌ event_room_pricing.price_per_room manquante';
    END IF;

    -- Vérifier que deposit_amount n'existe plus
    SELECT COUNT(*) INTO v_count
    FROM information_schema.columns
    WHERE table_name = 'event_room_pricing' AND column_name = 'deposit_amount';
    
    IF v_count = 0 THEN
        RAISE NOTICE '✅ event_room_pricing.deposit_amount supprimée';
    ELSE
        RAISE NOTICE '❌ event_room_pricing.deposit_amount existe encore';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration de correction terminée!';
    RAISE NOTICE 'Exécutez: npx ts-node scripts/verify-migration.ts';
    RAISE NOTICE '========================================';
END $$;
