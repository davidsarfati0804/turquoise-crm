-- =====================================================
-- MIGRATION 017: CONSOLIDATION & CORRECTIFS
-- =====================================================
-- Exécuter dans Supabase SQL Editor

-- 1. Colonne assigned_to sur client_files (manquante)
ALTER TABLE client_files
    ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(255);

-- 2. Colonne status sur leads (pour whatsapp mini-fiche PATCH)
-- (déjà présent mais s'assurer que le check est bon)

-- 3. Correctif price_per_night sur event_room_pricing
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

ALTER TABLE event_room_pricing DROP COLUMN IF EXISTS deposit_amount;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event_room_pricing' AND column_name = 'price_per_night'
    ) THEN
        ALTER TABLE event_room_pricing
            ALTER COLUMN price_per_night TYPE DECIMAL(10,2) USING price_per_night::DECIMAL(10,2),
            ALTER COLUMN price_per_night SET NOT NULL;
    END IF;
END $$;

-- 4. Champs vols sur client_files (si migration 016 pas encore jouée)
ALTER TABLE client_files
    ADD COLUMN IF NOT EXISTS flight_id_inbound UUID REFERENCES reference_flights(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS flight_id_outbound UUID REFERENCES reference_flights(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS flight_date_inbound DATE,
    ADD COLUMN IF NOT EXISTS flight_date_outbound DATE,
    ADD COLUMN IF NOT EXISTS room_number VARCHAR(20),
    ADD COLUMN IF NOT EXISTS nanny_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS nounou_included BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS transfer_notes TEXT,
    ADD COLUMN IF NOT EXISTS transfer_status VARCHAR(20) DEFAULT 'pending'
        CHECK (transfer_status IN ('pending', 'confirmed', 'done'));

-- 5. Champ nounou_included sur leads (si migration 016 pas encore jouée)
ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS nounou_included BOOLEAN DEFAULT FALSE;

-- 6. Table reference_flights (si migration 016 pas encore jouée)
CREATE TABLE IF NOT EXISTS reference_flights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    airline VARCHAR(100) NOT NULL,
    flight_number VARCHAR(20) NOT NULL,
    flight_type VARCHAR(10) NOT NULL CHECK (flight_type IN ('aller', 'retour')),
    origin VARCHAR(10) NOT NULL,
    destination VARCHAR(10) NOT NULL,
    scheduled_time TIME NOT NULL,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT reference_flights_flight_number_key UNIQUE (flight_number)
);

ALTER TABLE reference_flights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read reference_flights" ON reference_flights;
CREATE POLICY "Authenticated users can read reference_flights" ON reference_flights
    FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can manage reference_flights" ON reference_flights;
CREATE POLICY "Authenticated users can manage reference_flights" ON reference_flights
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Pré-population vols (idempotent)
INSERT INTO reference_flights (airline, flight_number, flight_type, origin, destination, scheduled_time) VALUES
('Air France',                'AF470',   'aller', 'CDG', 'MRU', '08:20'),
('Air France / Air Mauritius','AF7964',  'aller', 'CDG', 'MRU', '06:25'),
('Air Mauritius',             'MK015',   'aller', 'CDG', 'MRU', '06:35'),
('Emirates',                  'EK701',   'aller', 'DXB', 'MRU', '09:10'),
('Emirates',                  'EK703',   'aller', 'DXB', 'MRU', '16:30'),
('Emirates',                  'EK709',   'aller', 'DXB', 'MRU', '14:40'),
('Corsair',                   'SS632',   'aller', 'ORY', 'MRU', '11:15'),
('Corsair',                   'SS958',   'aller', 'ORY', 'MRU', '10:55'),
('Condor',                    'DE2314',  'aller', 'FRA', 'MRU', '06:25'),
('South African Airways',     'SA190',   'aller', 'JNB', 'MRU', '15:45'),
('South African Airways',     'SA194',   'aller', 'JNB', 'MRU', '16:25'),
('FlySafair',                 'FA850',   'aller', 'JNB', 'MRU', '15:15'),
('Air Mauritius',             'MK851',   'aller', 'CDG', 'MRU', '08:50'),
('Air Mauritius',             'MK853',   'aller', 'CDG', 'MRU', '18:55'),
('Air Mauritius',             'MK844',   'aller', 'CDG', 'MRU', '06:40'),
('Air France',                'AF473',   'retour', 'MRU', 'CDG', '10:40'),
('Air France',                'AF417',   'retour', 'MRU', 'CDG', '20:45'),
('Air France',                'AF418',   'retour', 'MRU', 'CDG', '13:35'),
('Air Mauritius',             'MK014',   'retour', 'MRU', 'CDG', '22:35'),
('Air France / Air Mauritius','AF7965',  'retour', 'MRU', 'CDG', '22:35'),
('Emirates',                  'EK704',   'retour', 'MRU', 'DXB', '22:30'),
('Emirates',                  'EK702',   'retour', 'MRU', 'DXB', '16:25'),
('Emirates',                  'EK710',   'retour', 'MRU', 'DXB', '06:30'),
('Corsair',                   'SS633',   'retour', 'MRU', 'ORY', '17:55'),
('Corsair',                   'SS959',   'retour', 'MRU', 'ORY', '21:40'),
('Kenya Airways',             'KQ271',   'retour', 'MRU', 'NBO', '18:30'),
('Condor',                    'DE2315',  'retour', 'MRU', 'FRA', '08:40'),
('South African Airways',     'SA191',   'retour', 'MRU', 'JNB', '16:35'),
('South African Airways',     'SA193',   'retour', 'MRU', 'JNB', '17:40'),
('South African Airways',     'SA195',   'retour', 'MRU', 'JNB', '17:15'),
('FlySafair',                 'FA851',   'retour', 'MRU', 'JNB', '16:15'),
('Air Mauritius',             'MK852',   'retour', 'MRU', 'CDG', '19:10'),
('Air Mauritius',             'MK843',   'retour', 'MRU', 'CDG', '17:45')
ON CONFLICT (flight_number) DO NOTHING;

-- Vérification
SELECT
    'assigned_to sur client_files' as check,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='client_files' AND column_name='assigned_to') THEN '✅ OK' ELSE '❌ MANQUANT' END as status
UNION ALL SELECT
    'price_per_night sur event_room_pricing',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_room_pricing' AND column_name='price_per_night') THEN '✅ OK' ELSE '❌ MANQUANT' END
UNION ALL SELECT
    'nounou_included sur client_files',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='client_files' AND column_name='nounou_included') THEN '✅ OK' ELSE '❌ MANQUANT' END
UNION ALL SELECT
    'nounou_included sur leads',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='nounou_included') THEN '✅ OK' ELSE '❌ MANQUANT' END
UNION ALL SELECT
    'reference_flights (nb vols)',
    (SELECT COUNT(*)::text || ' vols' FROM reference_flights);
