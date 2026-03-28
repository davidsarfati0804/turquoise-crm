-- =====================================================
-- TURQUOISE CRM - CORRECTIONS & BI FORMAT ENHANCEMENTS
-- =====================================================
-- Date: 2026-03-23
-- Description: 
--   1. Corrections from migration 004 (remove unused fields, rename columns)
--   2. Add missing fields to match Turquoise Club BI format
-- Based on: Official Turquoise Club BI template

-- =====================================================
-- SECTION 1: CORRECTIONS FROM MIGRATION 004
-- =====================================================

-- 1.1 Remove unused columns from EVENTS table
ALTER TABLE events 
DROP COLUMN IF EXISTS description,
DROP COLUMN IF EXISTS hotel_name;

COMMENT ON TABLE events IS 'Événements/Offres de voyage - description et hotel supprimés (inutiles)';

-- 1.2 Rename price_per_person to price_per_room (prix par chambre, pas par personne)
ALTER TABLE event_room_pricing 
RENAME COLUMN IF EXISTS price_per_person TO price_per_room;

COMMENT ON COLUMN event_room_pricing.price_per_room IS 'Prix par chambre (pas par personne)';

-- 1.3 Remove deposit_amount from event_room_pricing (not needed)
ALTER TABLE event_room_pricing 
DROP COLUMN IF EXISTS deposit_amount;

-- Note: start_date and end_date are already in events table from migration 004 ✅

-- =====================================================
-- SECTION 2: ADD BI FORMAT ENHANCEMENTS
-- =====================================================

-- 2.1 ADD TRAVEL DATES TO EVENTS
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS arrival_date DATE,
ADD COLUMN IF NOT EXISTS departure_date DATE,
ADD COLUMN IF NOT EXISTS nights_count INTEGER,
ADD COLUMN IF NOT EXISTS check_in_time TIME DEFAULT '15:00:00',
ADD COLUMN IF NOT EXISTS check_out_time TIME DEFAULT '12:00:00';

COMMENT ON COLUMN events.arrival_date IS 'Date d''arrivée (ex: 19/02/2026)';
COMMENT ON COLUMN events.departure_date IS 'Date de retour (ex: 01/03/2026)';
COMMENT ON COLUMN events.nights_count IS 'Nombre de nuitées (calculé ou manuel)';

-- 2.2 ADD ACCOMMODATION DETAILS TO EVENTS
ALTER TABLE events
ADD COLUMN IF NOT EXISTS pension_type VARCHAR(100) DEFAULT 'pension_complete',
ADD COLUMN IF NOT EXISTS pension_details TEXT DEFAULT 'Pension complète hors boissons',
ADD COLUMN IF NOT EXISTS room_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS nounou_included BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS nounou_details TEXT;

COMMENT ON COLUMN events.pension_type IS 'Type de pension (pension_complete, demi_pension, all_inclusive, etc.)';
COMMENT ON COLUMN events.pension_details IS 'Détails de la pension (ex: hors boissons)';
COMMENT ON COLUMN events.nounou_included IS 'Nounou privée incluse (pour enfants -4ans)';

-- 2.3 ADD INSURANCE TO CLIENT_FILES
ALTER TABLE client_files
ADD COLUMN IF NOT EXISTS insurance_included BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS insurance_accepted VARCHAR(50) DEFAULT 'annulation_complementaire_multirisque',
ADD COLUMN IF NOT EXISTS insurance_refused VARCHAR(50) DEFAULT 'annulation_complementaire_multirisque';

COMMENT ON COLUMN client_files.insurance_included IS 'Assurance incluse dans le forfait';
COMMENT ON COLUMN client_files.insurance_accepted IS 'Type d''assurance acceptée par le client';
COMMENT ON COLUMN client_files.insurance_refused IS 'Type d''assurance refusée par le client';

-- 2.4 ADD CANCELLATION POLICY TO CLIENT_FILES
ALTER TABLE client_files
ADD COLUMN IF NOT EXISTS cancellation_policy JSONB DEFAULT '{
  "more_than_2_months": "10%",
  "between_1_and_2_months": "30%",
  "between_15_days_and_1_month": "60%",
  "less_than_15_days": "100%"
}'::jsonb;

COMMENT ON COLUMN client_files.cancellation_policy IS 'Conditions d''annulation avec pourcentages';

-- 2.5 ADD PAYMENT CONDITIONS TO CLIENT_FILES
ALTER TABLE client_files
ADD COLUMN IF NOT EXISTS deposit_percentage DECIMAL(5,2) DEFAULT 50.00,
ADD COLUMN IF NOT EXISTS deposit_due_date DATE,
ADD COLUMN IF NOT EXISTS balance_due_date DATE,
ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '["cheque", "cb"]'::jsonb;

COMMENT ON COLUMN client_files.deposit_percentage IS 'Pourcentage d''acompte requis (ex: 50%)';
COMMENT ON COLUMN client_files.deposit_due_date IS 'Date limite paiement acompte (à la réservation)';
COMMENT ON COLUMN client_files.balance_due_date IS 'Date limite solde (1 mois avant départ)';
COMMENT ON COLUMN client_files.payment_methods IS 'Modes de paiement acceptés';

-- 2.6 ADD BANK DETAILS TO CLIENT_FILES
ALTER TABLE client_files
ADD COLUMN IF NOT EXISTS payment_bank_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_check_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS payment_cb_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS payment_cb_expiry VARCHAR(20),
ADD COLUMN IF NOT EXISTS payment_cb_cvv VARCHAR(10);

COMMENT ON COLUMN client_files.payment_bank_name IS 'Nom de la banque pour paiement';
COMMENT ON COLUMN client_files.payment_check_number IS 'Numéro de chèque';

-- 2.7 ADD SERVICES & OBSERVATIONS TO CLIENT_FILES
ALTER TABLE client_files
ADD COLUMN IF NOT EXISTS included_services TEXT[] DEFAULT ARRAY['Transferts aéroport/hôtel/aéroport']::TEXT[],
ADD COLUMN IF NOT EXISTS observations TEXT,
ADD COLUMN IF NOT EXISTS early_checkin_requested BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS late_checkout_requested BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS special_requests TEXT;

COMMENT ON COLUMN client_files.included_services IS 'Services inclus dans le forfait';
COMMENT ON COLUMN client_files.observations IS 'Observations spéciales (check-in/out, tarifs, etc.)';

-- 2.8 ADD SIGNATURE TRACKING TO BULLETIN_INSCRIPTIONS
ALTER TABLE bulletin_inscriptions
ADD COLUMN IF NOT EXISTS client_signature_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS client_signed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS signature_method VARCHAR(50);

COMMENT ON COLUMN bulletin_inscriptions.client_signature_status IS 'Statut signature (pending, signed, refused)';
COMMENT ON COLUMN bulletin_inscriptions.signature_method IS 'Méthode de signature (manuscrite, electronique)';

-- 2.9 CREATE COMPANY_SETTINGS TABLE (for agency info)
CREATE TABLE IF NOT EXISTS company_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Company Identity
    company_name VARCHAR(255) NOT NULL DEFAULT 'Club Turquoise',
    legal_name VARCHAR(255),
    
    -- Branding
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#0891b2',
    
    -- Contact
    address_line1 VARCHAR(255) DEFAULT '24 rue Octave Feuillet',
    address_line2 VARCHAR(255),
    postal_code VARCHAR(20) DEFAULT '75016',
    city VARCHAR(100) DEFAULT 'Paris',
    country VARCHAR(100) DEFAULT 'France',
    
    phone VARCHAR(50) DEFAULT '01 53 43 02 24',
    mobile VARCHAR(50) DEFAULT '06 50 51 51 51',
    email VARCHAR(255) DEFAULT 'contact@club-turquoise.fr',
    website VARCHAR(255) DEFAULT 'www.club-turquoise.fr',
    
    -- Legal
    siret VARCHAR(50) DEFAULT '882 208 374 00018',
    ape_code VARCHAR(20) DEFAULT '5710',
    tva_intracommunautaire VARCHAR(50) DEFAULT 'FR19882208374',
    
    -- Business
    license_number VARCHAR(100),
    insurance_policy VARCHAR(100),
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default Turquoise Club settings
INSERT INTO company_settings (
    company_name,
    address_line1,
    postal_code,
    city,
    phone,
    mobile,
    website,
    siret,
    ape_code,
    tva_intracommunautaire
) VALUES (
    'Club Turquoise',
    '24 rue Octave Feuillet',
    '75016',
    'Paris',
    '01 53 43 02 24',
    '06 50 51 51 51',
    'www.club-turquoise.fr',
    '882 208 374 00018',
    '5710',
    'FR19882208374'
) ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read company settings
CREATE POLICY "Allow authenticated users to read company_settings"
    ON company_settings FOR SELECT
    TO authenticated
    USING (true);

-- Only allow admins to update (you can refine this later)
CREATE POLICY "Allow authenticated users to update company_settings"
    ON company_settings FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_company_settings_updated_at 
BEFORE UPDATE ON company_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2.10 ADD HELPER FUNCTION TO CALCULATE NIGHTS
CREATE OR REPLACE FUNCTION calculate_nights(p_arrival_date DATE, p_departure_date DATE)
RETURNS INTEGER AS $$
BEGIN
    IF p_arrival_date IS NULL OR p_departure_date IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN EXTRACT(DAY FROM (p_departure_date - p_arrival_date));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_nights IS 'Calcule le nombre de nuitées entre deux dates';

-- 2.11 ADD HELPER FUNCTION FOR BI NUMBER GENERATION
CREATE OR REPLACE FUNCTION generate_bi_number(p_file_reference VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
    RETURN 'BI-' || p_file_reference;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2.12 UPDATE EXISTING EVENTS WITH DEFAULT VALUES
-- Set default check-in/out times for existing events
UPDATE events 
SET 
    check_in_time = '15:00:00',
    check_out_time = '12:00:00',
    pension_type = 'pension_complete',
    pension_details = 'Pension complète hors boissons'
WHERE check_in_time IS NULL OR check_out_time IS NULL;

-- 2.13 INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_events_arrival_date ON events(arrival_date);
CREATE INDEX IF NOT EXISTS idx_events_departure_date ON events(departure_date);
CREATE INDEX IF NOT EXISTS idx_client_files_deposit_due ON client_files(deposit_due_date);
CREATE INDEX IF NOT EXISTS idx_client_files_balance_due ON client_files(balance_due_date);

-- =====================================================
-- SECTION 3: DOCUMENTATION & SUMMARY
-- =====================================================

-- 3.1 COMMENTS FOR DOCUMENTATION
COMMENT ON TABLE company_settings IS 'Paramètres de l''agence (coordonnées, légal, branding)';
COMMENT ON TABLE events IS 'Événements/Offres de voyage (Séjours et Mariages)';
COMMENT ON TABLE client_files IS 'Dossiers clients avec toutes les informations commerciales';
COMMENT ON TABLE bulletin_inscriptions IS 'Bulletins d''inscription générés et envoyés';

-- =====================================================
-- =====================================================
-- 
-- SECTION 1: Corrections from migration 004
--   ✅ Removed description & hotel_name from events (not needed)
--   ✅ Renamed price_per_person → price_per_room (prix par chambre)
--   ✅ Removed deposit_amount from event_room_pricing (not needed)
--   ✅ Kept start_date & end_date in events (already present)
--
-- SECTION 2: BI Format Enhancements
--   ✅ Added arrival_date, departure_date, nights_count to events
--   ✅ Added check_in_time (15:00), check_out_time (12:00) to events
--   ✅ Added pension details (type, details, nounou) to events
--   ✅ Added insurance fields to client_files
--   ✅ Added cancellation policy (10%/30%/60%/100%) to client_files
--   ✅ Added payment conditions (deposit 50%, balance 1 month) to client_files
--   ✅ Added bank details to client_files
--   ✅ Added services & observations to client_files
--   ✅ Added signature tracking to bulletin_inscriptions
--   ✅ Created company_settings table with Turquoise Club defaults
--   ✅ Created helper functions (calculate_nights, generate_bi_number)
--   ✅ Added performance indexes
--
-- Next steps:
--   1. Update EventForm.tsx to use price_per_room instead of price_per_person
--   2. Remove description/hotel fields from event forms
--   3. Test BI generation with new fields
-- =====================================================
-- This migration adds all missing fields to match the Turquoise Club BI format
-- Next step: Update forms and BI template to use these new fields
