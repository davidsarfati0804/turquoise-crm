-- =====================================================
-- TURQUOISE CRM - SCHEMA POSTGRESQL COMPLET
-- =====================================================
-- Version: 1.0
-- Date: 2026-03-23
-- Description: Schéma complet avec 14 tables pour un CRM B2B moderne

-- Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- 1. TABLE: clients
-- =====================================================
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom VARCHAR(255) NOT NULL,
    type_client VARCHAR(50) CHECK (type_client IN ('entreprise', 'individu')) DEFAULT 'entreprise',
    secteur_activite VARCHAR(100),
    site_web VARCHAR(255),
    telephone VARCHAR(50),
    email VARCHAR(255),
    adresse_ligne1 VARCHAR(255),
    adresse_ligne2 VARCHAR(255),
    ville VARCHAR(100),
    code_postal VARCHAR(20),
    pays VARCHAR(100) DEFAULT 'France',
    statut VARCHAR(50) CHECK (statut IN ('actif', 'inactif', 'prospect')) DEFAULT 'prospect',
    source VARCHAR(100),
    nombre_employes INTEGER,
    chiffre_affaires DECIMAL(15, 2),
    date_creation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date_modification TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cree_par UUID REFERENCES auth.users(id),
    modifie_par UUID REFERENCES auth.users(id),
    notes TEXT
);

-- Index pour recherche full-text
CREATE INDEX IF NOT EXISTS idx_clients_nom_trgm ON clients USING gin (nom gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clients_statut ON clients(statut);
CREATE INDEX IF NOT EXISTS idx_clients_secteur ON clients(secteur_activite);

-- =====================================================
-- 2. TABLE: contacts
-- =====================================================
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    prenom VARCHAR(100) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    poste VARCHAR(150),
    email VARCHAR(255) UNIQUE,
    telephone_mobile VARCHAR(50),
    telephone_fixe VARCHAR(50),
    linkedin_url VARCHAR(255),
    est_principal BOOLEAN DEFAULT FALSE,
    statut VARCHAR(50) CHECK (statut IN ('actif', 'inactif')) DEFAULT 'actif',
    date_naissance DATE,
    date_creation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date_modification TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cree_par UUID REFERENCES auth.users(id),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_contacts_client ON contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_nom_trgm ON contacts USING gin ((prenom || ' ' || nom) gin_trgm_ops);

-- =====================================================
-- 3. TABLE: opportunites
-- =====================================================
CREATE TABLE IF NOT EXISTS opportunites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    montant DECIMAL(15, 2),
    devise VARCHAR(3) DEFAULT 'EUR',
    probabilite INTEGER CHECK (probabilite >= 0 AND probabilite <= 100),
    etape VARCHAR(100) CHECK (etape IN ('prospection', 'qualification', 'proposition', 'negociation', 'gagnee', 'perdue')) DEFAULT 'prospection',
    date_cloture_estimee DATE,
    date_cloture_reelle DATE,
    statut VARCHAR(50) CHECK (statut IN ('ouvert', 'gagne', 'perdu', 'annule')) DEFAULT 'ouvert',
    source VARCHAR(100),
    concurrent VARCHAR(255),
    date_creation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date_modification TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigne_a UUID REFERENCES auth.users(id),
    cree_par UUID REFERENCES auth.users(id),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_opportunites_client ON opportunites(client_id);
CREATE INDEX IF NOT EXISTS idx_opportunites_etape ON opportunites(etape);
CREATE INDEX IF NOT EXISTS idx_opportunites_statut ON opportunites(statut);
CREATE INDEX IF NOT EXISTS idx_opportunites_assigne ON opportunites(assigne_a);
CREATE INDEX IF NOT EXISTS idx_opportunites_date_cloture ON opportunites(date_cloture_estimee);

-- =====================================================
-- 4. TABLE: activites
-- =====================================================
CREATE TABLE IF NOT EXISTS activites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type_activite VARCHAR(50) CHECK (type_activite IN ('appel', 'email', 'reunion', 'tache', 'note')) NOT NULL,
    sujet VARCHAR(255) NOT NULL,
    description TEXT,
    date_debut TIMESTAMP WITH TIME ZONE NOT NULL,
    date_fin TIMESTAMP WITH TIME ZONE,
    duree_minutes INTEGER,
    statut VARCHAR(50) CHECK (statut IN ('planifie', 'en_cours', 'termine', 'annule')) DEFAULT 'planifie',
    priorite VARCHAR(20) CHECK (priorite IN ('basse', 'normale', 'haute', 'urgente')) DEFAULT 'normale',
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    opportunite_id UUID REFERENCES opportunites(id) ON DELETE SET NULL,
    assigne_a UUID REFERENCES auth.users(id),
    cree_par UUID REFERENCES auth.users(id),
    date_creation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resultat TEXT
);

CREATE INDEX IF NOT EXISTS idx_activites_client ON activites(client_id);
CREATE INDEX IF NOT EXISTS idx_activites_contact ON activites(contact_id);
CREATE INDEX IF NOT EXISTS idx_activites_opportunite ON activites(opportunite_id);
CREATE INDEX IF NOT EXISTS idx_activites_assigne ON activites(assigne_a);
CREATE INDEX IF NOT EXISTS idx_activites_date ON activites(date_debut);
CREATE INDEX IF NOT EXISTS idx_activites_statut ON activites(statut);

-- =====================================================
-- 5. TABLE: devis
-- =====================================================
CREATE TABLE IF NOT EXISTS devis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_devis VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    opportunite_id UUID REFERENCES opportunites(id) ON DELETE SET NULL,
    date_emission DATE NOT NULL,
    date_expiration DATE,
    montant_ht DECIMAL(15, 2) NOT NULL,
    taux_tva DECIMAL(5, 2) DEFAULT 20.00,
    montant_ttc DECIMAL(15, 2) NOT NULL,
    devise VARCHAR(3) DEFAULT 'EUR',
    statut VARCHAR(50) CHECK (statut IN ('brouillon', 'envoye', 'accepte', 'refuse', 'expire')) DEFAULT 'brouillon',
    conditions_paiement TEXT,
    notes TEXT,
    date_creation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date_modification TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cree_par UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_devis_client ON devis(client_id);
CREATE INDEX IF NOT EXISTS idx_devis_numero ON devis(numero_devis);
CREATE INDEX IF NOT EXISTS idx_devis_statut ON devis(statut);

-- =====================================================
-- 6. TABLE: lignes_devis
-- =====================================================
CREATE TABLE IF NOT EXISTS lignes_devis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    devis_id UUID REFERENCES devis(id) ON DELETE CASCADE,
    ordre INTEGER NOT NULL,
    designation VARCHAR(255) NOT NULL,
    description TEXT,
    quantite DECIMAL(10, 2) NOT NULL DEFAULT 1,
    prix_unitaire_ht DECIMAL(15, 2) NOT NULL,
    taux_remise DECIMAL(5, 2) DEFAULT 0,
    montant_ht DECIMAL(15, 2) NOT NULL,
    taux_tva DECIMAL(5, 2) DEFAULT 20.00
);

CREATE INDEX IF NOT EXISTS idx_lignes_devis_devis ON lignes_devis(devis_id);

-- =====================================================
-- 7. TABLE: factures
-- =====================================================
CREATE TABLE IF NOT EXISTS factures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_facture VARCHAR(50) UNIQUE NOT NULL,
    devis_id UUID REFERENCES devis(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    date_emission DATE NOT NULL,
    date_echeance DATE,
    montant_ht DECIMAL(15, 2) NOT NULL,
    taux_tva DECIMAL(5, 2) DEFAULT 20.00,
    montant_ttc DECIMAL(15, 2) NOT NULL,
    devise VARCHAR(3) DEFAULT 'EUR',
    statut VARCHAR(50) CHECK (statut IN ('brouillon', 'envoyee', 'payee', 'en_retard', 'annulee')) DEFAULT 'brouillon',
    mode_paiement VARCHAR(50),
    date_paiement DATE,
    conditions_paiement TEXT,
    notes TEXT,
    date_creation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date_modification TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cree_par UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_factures_client ON factures(client_id);
CREATE INDEX IF NOT EXISTS idx_factures_numero ON factures(numero_facture);
CREATE INDEX IF NOT EXISTS idx_factures_statut ON factures(statut);
CREATE INDEX IF NOT EXISTS idx_factures_date_echeance ON factures(date_echeance);

-- =====================================================
-- 8. TABLE: lignes_factures
-- =====================================================
CREATE TABLE IF NOT EXISTS lignes_factures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facture_id UUID REFERENCES factures(id) ON DELETE CASCADE,
    ordre INTEGER NOT NULL,
    designation VARCHAR(255) NOT NULL,
    description TEXT,
    quantite DECIMAL(10, 2) NOT NULL DEFAULT 1,
    prix_unitaire_ht DECIMAL(15, 2) NOT NULL,
    taux_remise DECIMAL(5, 2) DEFAULT 0,
    montant_ht DECIMAL(15, 2) NOT NULL,
    taux_tva DECIMAL(5, 2) DEFAULT 20.00
);

CREATE INDEX IF NOT EXISTS idx_lignes_factures_facture ON lignes_factures(facture_id);

-- =====================================================
-- 9. TABLE: produits
-- =====================================================
CREATE TABLE IF NOT EXISTS produits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference VARCHAR(50) UNIQUE NOT NULL,
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    categorie VARCHAR(100),
    prix_unitaire_ht DECIMAL(15, 2) NOT NULL,
    taux_tva DECIMAL(5, 2) DEFAULT 20.00,
    unite VARCHAR(50) DEFAULT 'unité',
    stock_actuel INTEGER DEFAULT 0,
    stock_minimum INTEGER DEFAULT 0,
    actif BOOLEAN DEFAULT TRUE,
    date_creation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date_modification TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cree_par UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_produits_reference ON produits(reference);
CREATE INDEX IF NOT EXISTS idx_produits_categorie ON produits(categorie);
CREATE INDEX IF NOT EXISTS idx_produits_nom_trgm ON produits USING gin (nom gin_trgm_ops);

-- =====================================================
-- 10. TABLE: documents
-- =====================================================
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom_fichier VARCHAR(255) NOT NULL,
    type_fichier VARCHAR(100),
    taille_octets BIGINT,
    url_stockage TEXT NOT NULL,
    type_document VARCHAR(50) CHECK (type_document IN ('contrat', 'presentation', 'rapport', 'autre')) DEFAULT 'autre',
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    opportunite_id UUID REFERENCES opportunites(id) ON DELETE SET NULL,
    devis_id UUID REFERENCES devis(id) ON DELETE SET NULL,
    facture_id UUID REFERENCES factures(id) ON DELETE SET NULL,
    date_upload TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploade_par UUID REFERENCES auth.users(id),
    description TEXT
);

CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_opportunite ON documents(opportunite_id);
CREATE INDEX IF NOT EXISTS idx_documents_devis ON documents(devis_id);
CREATE INDEX IF NOT EXISTS idx_documents_facture ON documents(facture_id);

-- =====================================================
-- 11. TABLE: notes
-- =====================================================
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contenu TEXT NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    opportunite_id UUID REFERENCES opportunites(id) ON DELETE CASCADE,
    date_creation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date_modification TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cree_par UUID REFERENCES auth.users(id),
    modifie_par UUID REFERENCES auth.users(id),
    epingle BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_notes_client ON notes(client_id);
CREATE INDEX IF NOT EXISTS idx_notes_contact ON notes(contact_id);
CREATE INDEX IF NOT EXISTS idx_notes_opportunite ON notes(opportunite_id);
CREATE INDEX IF NOT EXISTS idx_notes_cree_par ON notes(cree_par);

-- =====================================================
-- 12. TABLE: tags
-- =====================================================
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom VARCHAR(100) UNIQUE NOT NULL,
    couleur VARCHAR(7) DEFAULT '#3B82F6',
    description TEXT,
    date_creation TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tags_nom ON tags(nom);

-- =====================================================
-- 13. TABLE: tags_entites (relation many-to-many)
-- =====================================================
CREATE TABLE IF NOT EXISTS tags_entites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    entite_type VARCHAR(50) CHECK (entite_type IN ('client', 'contact', 'opportunite', 'activite')) NOT NULL,
    entite_id UUID NOT NULL,
    date_creation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tag_id, entite_type, entite_id)
);

CREATE INDEX IF NOT EXISTS idx_tags_entites_tag ON tags_entites(tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_entites_entite ON tags_entites(entite_type, entite_id);

-- =====================================================
-- 14. TABLE: profils_utilisateurs
-- =====================================================
CREATE TABLE IF NOT EXISTS profils_utilisateurs (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nom_complet VARCHAR(255),
    poste VARCHAR(150),
    telephone VARCHAR(50),
    avatar_url TEXT,
    role VARCHAR(50) CHECK (role IN ('admin', 'commercial', 'manager', 'utilisateur')) DEFAULT 'utilisateur',
    equipe VARCHAR(100),
    actif BOOLEAN DEFAULT TRUE,
    date_creation TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date_derniere_connexion TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_profils_role ON profils_utilisateurs(role);
CREATE INDEX IF NOT EXISTS idx_profils_equipe ON profils_utilisateurs(equipe);

-- =====================================================
-- FONCTIONS & TRIGGERS
-- =====================================================

-- Fonction pour mettre à jour automatiquement date_modification
CREATE OR REPLACE FUNCTION update_date_modification()
RETURNS TRIGGER AS $$
BEGIN
    NEW.date_modification = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour date_modification (avec DROP IF EXISTS pour idempotence)
DROP TRIGGER IF EXISTS update_clients_modification ON clients;
CREATE TRIGGER update_clients_modification BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_date_modification();

DROP TRIGGER IF EXISTS update_contacts_modification ON contacts;
CREATE TRIGGER update_contacts_modification BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_date_modification();

DROP TRIGGER IF EXISTS update_opportunites_modification ON opportunites;
CREATE TRIGGER update_opportunites_modification BEFORE UPDATE ON opportunites FOR EACH ROW EXECUTE FUNCTION update_date_modification();

DROP TRIGGER IF EXISTS update_devis_modification ON devis;
CREATE TRIGGER update_devis_modification BEFORE UPDATE ON devis FOR EACH ROW EXECUTE FUNCTION update_date_modification();

DROP TRIGGER IF EXISTS update_factures_modification ON factures;
CREATE TRIGGER update_factures_modification BEFORE UPDATE ON factures FOR EACH ROW EXECUTE FUNCTION update_date_modification();

DROP TRIGGER IF EXISTS update_produits_modification ON produits;
CREATE TRIGGER update_produits_modification BEFORE UPDATE ON produits FOR EACH ROW EXECUTE FUNCTION update_date_modification();

DROP TRIGGER IF EXISTS update_notes_modification ON notes;
CREATE TRIGGER update_notes_modification BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_date_modification();

-- =====================================================
-- VUES UTILES
-- =====================================================

-- Vue: Pipeline des opportunités avec montants agrégés
DROP VIEW IF EXISTS vue_pipeline_opportunites;
CREATE OR REPLACE VIEW vue_pipeline_opportunites AS
SELECT 
    o.etape,
    COUNT(o.id) as nombre_opportunites,
    SUM(o.montant) as montant_total,
    AVG(o.probabilite) as probabilite_moyenne,
    o.devise
FROM opportunites o
WHERE o.statut = 'ouvert'
GROUP BY o.etape, o.devise
ORDER BY 
    CASE o.etape
        WHEN 'prospection' THEN 1
        WHEN 'qualification' THEN 2
        WHEN 'proposition' THEN 3
        WHEN 'negociation' THEN 4
        ELSE 5
    END;

-- Vue: Statistiques par commercial
DROP VIEW IF EXISTS vue_stats_commerciaux;
CREATE OR REPLACE VIEW vue_stats_commerciaux AS
SELECT 
    u.id,
    p.nom_complet,
    COUNT(DISTINCT o.id) as nombre_opportunites,
    SUM(CASE WHEN o.statut = 'gagne' THEN o.montant ELSE 0 END) as ca_realise,
    SUM(CASE WHEN o.statut = 'ouvert' THEN o.montant ELSE 0 END) as pipeline_actif,
    COUNT(DISTINCT c.id) as nombre_clients
FROM auth.users u
LEFT JOIN profils_utilisateurs p ON u.id = p.id
LEFT JOIN opportunites o ON o.assigne_a = u.id
LEFT JOIN clients c ON c.cree_par = u.id
GROUP BY u.id, p.nom_complet;

DROP VIEW IF EXISTS vue_activites_a_venir;
-- Vue: Activités à venir
CREATE OR REPLACE VIEW vue_activites_a_venir AS
SELECT 
    a.id,
    a.type_activite,
    a.sujet,
    a.date_debut,
    a.priorite,
    c.nom as client_nom,
    ct.prenom || ' ' || ct.nom as contact_nom,
    p.nom_complet as assigne_a_nom
FROM activites a
LEFT JOIN clients c ON a.client_id = c.id
LEFT JOIN contacts ct ON a.contact_id = ct.id
LEFT JOIN profils_utilisateurs p ON a.assigne_a = p.id
WHERE a.statut IN ('planifie', 'en_cours')
AND a.date_debut >= NOW()
ORDER BY a.date_debut ASC;

-- =====================================================
-- COMMENTAIRES SUR LES TABLES
-- =====================================================

COMMENT ON TABLE clients IS 'Table principale des clients et prospects';
COMMENT ON TABLE contacts IS 'Contacts associés aux clients';
COMMENT ON TABLE opportunites IS 'Opportunités commerciales (deals)';
COMMENT ON TABLE activites IS 'Activités (appels, emails, réunions, tâches)';
COMMENT ON TABLE devis IS 'Devis envoyés aux clients';
COMMENT ON TABLE factures IS 'Factures émises';
COMMENT ON TABLE produits IS 'Catalogue de produits/services';
COMMENT ON TABLE documents IS 'Fichiers attachés aux entités';
COMMENT ON TABLE notes IS 'Notes internes sur clients/contacts/opportunités';
COMMENT ON TABLE tags IS 'Tags pour catégoriser les entités';
COMMENT ON TABLE profils_utilisateurs IS 'Profils étendus des utilisateurs';

-- =====================================================
-- FIN DU SCHEMA
-- =====================================================
