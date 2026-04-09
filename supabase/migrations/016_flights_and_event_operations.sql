-- =====================================================
-- MIGRATION 016: RÉFÉRENTIEL VOLS + OPÉRATIONS ÉVÉNEMENT
-- =====================================================

-- 1. TABLE: reference_flights (Catalogue des vols)
-- =====================================================
CREATE TABLE IF NOT EXISTS reference_flights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    airline VARCHAR(100) NOT NULL,
    flight_number VARCHAR(20) NOT NULL,
    flight_type VARCHAR(10) NOT NULL CHECK (flight_type IN ('aller', 'retour')),
    origin VARCHAR(10) NOT NULL,       -- Code IATA (ex: CDG, MRU)
    destination VARCHAR(10) NOT NULL,  -- Code IATA
    scheduled_time TIME NOT NULL,      -- Heure arrivée (aller) ou départ (retour)
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT reference_flights_flight_number_key UNIQUE (flight_number)
);

DROP TRIGGER IF EXISTS update_reference_flights_updated_at ON reference_flights;
CREATE TRIGGER update_reference_flights_updated_at BEFORE UPDATE ON reference_flights
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE reference_flights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read reference_flights" ON reference_flights;
CREATE POLICY "Authenticated users can read reference_flights" ON reference_flights
    FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can manage reference_flights" ON reference_flights;
CREATE POLICY "Authenticated users can manage reference_flights" ON reference_flights
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. PRÉ-POPULATION: Vols saison 2026
-- =====================================================
INSERT INTO reference_flights (airline, flight_number, flight_type, origin, destination, scheduled_time) VALUES
-- VOLS ALLER (vers Maurice MRU)
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
-- VOLS RETOUR (depuis Maurice MRU)
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

-- 3. CHAMPS OPÉRATIONNELS SUR client_files
-- =====================================================
-- Vols
ALTER TABLE client_files
    ADD COLUMN IF NOT EXISTS flight_id_inbound UUID REFERENCES reference_flights(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS flight_id_outbound UUID REFERENCES reference_flights(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS flight_date_inbound DATE,
    ADD COLUMN IF NOT EXISTS flight_date_outbound DATE,
    -- Chambre
    ADD COLUMN IF NOT EXISTS room_number VARCHAR(20),
    -- Nanny
    ADD COLUMN IF NOT EXISTS nanny_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS nounou_included BOOLEAN DEFAULT FALSE,
    -- Transfert
    ADD COLUMN IF NOT EXISTS transfer_notes TEXT,
    ADD COLUMN IF NOT EXISTS transfer_status VARCHAR(20) DEFAULT 'pending'
        CHECK (transfer_status IN ('pending', 'confirmed', 'done'));

-- 4. CHAMP nounou_included SUR leads
-- =====================================================
ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS nounou_included BOOLEAN DEFAULT FALSE;

-- Index utiles
CREATE INDEX IF NOT EXISTS idx_client_files_flight_inbound ON client_files(flight_id_inbound);
CREATE INDEX IF NOT EXISTS idx_client_files_flight_outbound ON client_files(flight_id_outbound);
CREATE INDEX IF NOT EXISTS idx_client_files_flight_date_in ON client_files(flight_date_inbound);
CREATE INDEX IF NOT EXISTS idx_client_files_flight_date_out ON client_files(flight_date_outbound);
