-- =====================================================
-- TURQUOISE CRM - TRAVEL AGENCY SCHEMA (MIGRATION)
-- =====================================================
-- Version: 2.0
-- Date: 2026-03-23
-- Description: Migration from B2B CRM to Travel Agency CRM
-- This replaces the old schema with tables for events, leads, client files, participants, etc.

-- =====================================================
-- DROP OLD B2B TABLES (if this is a fresh migration)
-- =====================================================
-- Note: Only uncomment if doing a complete reset
-- DROP TABLE IF EXISTS tags_entites CASCADE;
-- DROP TABLE IF EXISTS tags CASCADE;
-- DROP TABLE IF EXISTS notes CASCADE;
-- DROP TABLE IF EXISTS documents CASCADE;
-- DROP TABLE IF EXISTS produits CASCADE;
-- DROP TABLE IF EXISTS lignes_factures CASCADE;
-- DROP TABLE IF EXISTS factures CASCADE;
-- DROP TABLE IF EXISTS lignes_devis CASCADE;
-- DROP TABLE IF EXISTS devis CASCADE;
-- DROP TABLE IF EXISTS activites CASCADE;
-- DROP TABLE IF EXISTS opportunites CASCADE;
-- DROP TABLE IF EXISTS contacts CASCADE;
-- DROP TABLE IF EXISTS clients CASCADE;

-- =====================================================
-- 1. TABLE: events (Événements/Offres)
-- =====================================================
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    event_type VARCHAR(50) CHECK (event_type IN ('sejour', 'mariage')) DEFAULT 'sejour',
    status VARCHAR(50) CHECK (status IN ('draft', 'upcoming', 'active', 'completed', 'cancelled')) DEFAULT 'upcoming',
    
    -- Dates (optionnelles car événements = offres, pas dates précises)
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    
    -- Localisation
    destination_label VARCHAR(255),
    hotel_name VARCHAR(255),
    
    -- Ventes
    sales_open_at TIMESTAMP WITH TIME ZONE,
    sales_close_at TIMESTAMP WITH TIME ZONE,
    
    -- Contenu
    description TEXT,
    notes TEXT,
    
    -- Métadonnées
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. TABLE: room_types (Types de chambre)
-- =====================================================
CREATE TABLE IF NOT EXISTS room_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_capacity INTEGER DEFAULT 2,
    max_capacity INTEGER DEFAULT 2,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_types_active ON room_types(is_active);
CREATE INDEX IF NOT EXISTS idx_room_types_code ON room_types(code);

-- Seed des 4 types de chambres standards
INSERT INTO room_types (code, name, description, base_capacity, max_capacity, display_order) VALUES
('JUNIOR_SUITE', 'Junior Suite', 'Chambre confortable avec vue jardin', 2, 2, 1),
('PREMIUM_SUITE', 'Premium Suite', 'Chambre premium avec balcon', 2, 2, 2),
('FAMILY', 'Family', 'Chambre familiale spacieuse', 4, 4, 3),
('OCEAN_FRONT', 'Ocean Front', 'Chambre avec vue mer directe', 2, 3, 4)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 3. TABLE: event_room_pricing (Prix par événement × chambre)
-- =====================================================
CREATE TABLE IF NOT EXISTS event_room_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
    
    -- Prix
    price_per_person DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    deposit_amount DECIMAL(10, 2),
    
    -- Optionnel
    label VARCHAR(255),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    max_occupancy INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(event_id, room_type_id)
);

CREATE INDEX IF NOT EXISTS idx_event_room_pricing_event ON event_room_pricing(event_id);
CREATE INDEX IF NOT EXISTS idx_event_room_pricing_room_type ON event_room_pricing(room_type_id);

CREATE TRIGGER update_event_room_pricing_updated_at BEFORE UPDATE ON event_room_pricing
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. TABLE: leads (Demandes entrantes)
-- =====================================================
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    
    -- Contact
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    
    -- Informations voyage
    adults_count INTEGER DEFAULT 1,
    children_count INTEGER DEFAULT 0,
    babies_count INTEGER DEFAULT 0,
    preferred_room_type_id UUID REFERENCES room_types(id),
    
    -- Statut
    status VARCHAR(50) CHECK (status IN ('nouveau', 'en_cours', 'converti', 'perdu')) DEFAULT 'nouveau',
    source VARCHAR(100),
    
    -- Métadonnées
    notes TEXT,
    converted_to_file_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_event ON leads(event_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. TABLE: client_files (Dossiers clients)
-- =====================================================
CREATE TABLE IF NOT EXISTS client_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    
    -- Référence unique
    file_reference VARCHAR(50) UNIQUE NOT NULL,
    
    -- Statuts
    crm_status VARCHAR(50) CHECK (crm_status IN (
        'lead',
        'inscription_en_cours',
        'bulletin_pret',
        'valide',
        'paiement_en_attente',
        'paye',
        'annule'
    )) DEFAULT 'inscription_en_cours',
    payment_status VARCHAR(50) CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')) DEFAULT 'pending',
    invoice_status VARCHAR(50) CHECK (invoice_status IN ('not_sent', 'sent', 'paid')) DEFAULT 'not_sent',
    
    -- Contact principal
    primary_contact_first_name VARCHAR(255) NOT NULL,
    primary_contact_last_name VARCHAR(255) NOT NULL,
    primary_contact_phone VARCHAR(50) NOT NULL,
    primary_contact_email VARCHAR(255),
    
    -- Commercial
    total_participants INTEGER DEFAULT 1,
    adults_count INTEGER DEFAULT 1,
    children_count INTEGER DEFAULT 0,
    babies_count INTEGER DEFAULT 0,
    selected_room_type_id UUID REFERENCES room_types(id),
    quoted_price DECIMAL(10, 2),
    amount_paid DECIMAL(10, 2) DEFAULT 0,
    balance_due DECIMAL(10, 2),
    
    -- Métadonnées
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_files_event ON client_files(event_id);
CREATE INDEX IF NOT EXISTS idx_client_files_lead ON client_files(lead_id);
CREATE INDEX IF NOT EXISTS idx_client_files_crm_status ON client_files(crm_status);
CREATE INDEX IF NOT EXISTS idx_client_files_reference ON client_files(file_reference);

CREATE TRIGGER update_client_files_updated_at BEFORE UPDATE ON client_files
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function pour générer une référence de dossier
CREATE OR REPLACE FUNCTION generate_file_reference()
RETURNS TEXT AS $$
DECLARE
    new_ref TEXT;
    year_suffix TEXT;
    counter INTEGER;
BEGIN
    year_suffix := TO_CHAR(NOW(), 'YY');
    
    -- Trouver le dernier compteur pour l'année en cours
    SELECT COALESCE(MAX(CAST(SUBSTRING(file_reference FROM 8) AS INTEGER)), 0) + 1
    INTO counter
    FROM client_files
    WHERE file_reference LIKE 'MAU-' || year_suffix || '%';
    
    new_ref := 'MAU-' || year_suffix || '-' || LPAD(counter::TEXT, 4, '0');
    RETURN new_ref;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. TABLE: participants (Participants d'un dossier)
-- =====================================================
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_file_id UUID NOT NULL REFERENCES client_files(id) ON DELETE CASCADE,
    
    -- Identité
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
    
    -- Type
    participant_type VARCHAR(50) CHECK (participant_type IN ('adult', 'child', 'baby')) DEFAULT 'adult',
    
    -- Contact
    phone VARCHAR(50),
    email VARCHAR(255),
    
    -- Documents
    passport_number VARCHAR(100),
    passport_expiry DATE,
    
    -- Métadonnées
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_participants_file ON participants(client_file_id);
CREATE INDEX IF NOT EXISTS idx_participants_type ON participants(participant_type);

CREATE TRIGGER update_participants_updated_at BEFORE UPDATE ON participants
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. TABLE: payment_links (Liens de paiement)
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_file_id UUID NOT NULL REFERENCES client_files(id) ON DELETE CASCADE,
    
    -- Lien
    payment_url TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    
    -- Statut
    status VARCHAR(50) CHECK (status IN ('sent', 'pending', 'paid', 'expired', 'cancelled')) DEFAULT 'sent',
    
    -- Dates
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Métadonnées
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_links_file ON payment_links(client_file_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_status ON payment_links(status);

-- =====================================================
-- 8. TABLE: invoices (Factures)
-- =====================================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_file_id UUID NOT NULL REFERENCES client_files(id) ON DELETE CASCADE,
    
    -- Référence
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Montants
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    
    -- Statut
    status VARCHAR(50) CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')) DEFAULT 'draft',
    
    -- Dates
    issued_at DATE DEFAULT CURRENT_DATE,
    due_at DATE,
    paid_at DATE,
    
    -- Fichier PDF
    pdf_url TEXT,
    
    -- Métadonnées
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_file ON invoices(client_file_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. TABLE: activity_logs (Historique d'activité)
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_file_id UUID REFERENCES client_files(id) ON DELETE CASCADE,
    
    -- Action
    action_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    
    -- Acteur
    user_id UUID REFERENCES auth.users(id),
    user_email VARCHAR(255),
    
    -- Métadonnées
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_file ON activity_logs(client_file_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);

-- =====================================================
-- 10. TABLE: internal_notes (Notes internes)
-- =====================================================
CREATE TABLE IF NOT EXISTS internal_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_file_id UUID NOT NULL REFERENCES client_files(id) ON DELETE CASCADE,
    
    -- Contenu
    content TEXT NOT NULL,
    
    -- Auteur
    author_id UUID REFERENCES auth.users(id),
    author_name VARCHAR(255),
    
    -- Métadonnées
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_internal_notes_file ON internal_notes(client_file_id);
CREATE INDEX IF NOT EXISTS idx_internal_notes_created ON internal_notes(created_at);

CREATE TRIGGER update_internal_notes_updated_at BEFORE UPDATE ON internal_notes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 11. TABLE: bulletin_inscriptions (BI générés)
-- =====================================================
CREATE TABLE IF NOT EXISTS bulletin_inscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_file_id UUID NOT NULL REFERENCES client_files(id) ON DELETE CASCADE,
    
    -- Référence
    bi_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Contenu (snapshot des données au moment de la génération)
    data JSONB NOT NULL,
    
    -- Fichier PDF
    pdf_url TEXT,
    
    -- Envoi
    sent_via_whatsapp BOOLEAN DEFAULT FALSE,
    sent_via_email BOOLEAN DEFAULT FALSE,
    whatsapp_sent_at TIMESTAMP WITH TIME ZONE,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Métadonnées
    generated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bi_file ON bulletin_inscriptions(client_file_id);
CREATE INDEX IF NOT EXISTS idx_bi_number ON bulletin_inscriptions(bi_number);

-- =====================================================
-- ENABLE RLS ON NEW TABLES
-- =====================================================
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_room_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulletin_inscriptions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- BASIC RLS POLICIES (allow authenticated users)
-- =====================================================
CREATE POLICY "Allow authenticated users to read events"
    ON events FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to manage events"
    ON events FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read room_types"
    ON room_types FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to manage room_types"
    ON room_types FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read event_room_pricing"
    ON event_room_pricing FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to manage event_room_pricing"
    ON event_room_pricing FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read leads"
    ON leads FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to manage leads"
    ON leads FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read client_files"
    ON client_files FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to manage client_files"
    ON client_files FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read participants"
    ON participants FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to manage participants"
    ON participants FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read payment_links"
    ON payment_links FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to manage payment_links"
    ON payment_links FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read invoices"
    ON invoices FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to manage invoices"
    ON invoices FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read activity_logs"
    ON activity_logs FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to create activity_logs"
    ON activity_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read internal_notes"
    ON internal_notes FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to manage internal_notes"
    ON internal_notes FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read bulletin_inscriptions"
    ON bulletin_inscriptions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to manage bulletin_inscriptions"
    ON bulletin_inscriptions FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE events IS 'Événements/Offres de voyage (Séjours, Mariages)';
COMMENT ON TABLE room_types IS 'Types de chambres disponibles';
COMMENT ON TABLE event_room_pricing IS 'Prix par événement × type de chambre';
COMMENT ON TABLE leads IS 'Demandes entrantes de clients potentiels';
COMMENT ON TABLE client_files IS 'Dossiers clients avec statut CRM';
COMMENT ON TABLE participants IS 'Participants sur un dossier client';
COMMENT ON TABLE payment_links IS 'Liens de paiement envoyés aux clients';
COMMENT ON TABLE invoices IS 'Factures générées';
COMMENT ON TABLE activity_logs IS 'Historique d''activité sur les dossiers';
COMMENT ON TABLE internal_notes IS 'Notes internes sur les dossiers';
COMMENT ON TABLE bulletin_inscriptions IS 'Bulletins d''inscription générés et envoyés';

-- =====================================================
-- FIN DU SCHEMA TRAVEL AGENCY
-- =====================================================
