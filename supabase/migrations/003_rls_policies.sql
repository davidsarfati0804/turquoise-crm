-- =====================================================
-- TURQUOISE CRM - Row Level Security (RLS) Policies
-- =====================================================
-- Version: 1.0
-- Date: 2026-03-23
-- Description: Politiques de sécurité pour le CRM

-- =====================================================
-- ACTIVER RLS SUR TOUTES LES TABLES
-- =====================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunites ENABLE ROW LEVEL SECURITY;
ALTER TABLE activites ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis ENABLE ROW LEVEL SECURITY;
ALTER TABLE lignes_devis ENABLE ROW LEVEL SECURITY;
ALTER TABLE factures ENABLE ROW LEVEL SECURITY;
ALTER TABLE lignes_factures ENABLE ROW LEVEL SECURITY;
ALTER TABLE produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags_entites ENABLE ROW LEVEL SECURITY;
ALTER TABLE profils_utilisateurs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Vérifier si l'utilisateur est admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profils_utilisateurs
    WHERE id = auth.uid()
    AND role = 'admin'
    AND actif = true
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Vérifier si l'utilisateur est actif
CREATE OR REPLACE FUNCTION is_active_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profils_utilisateurs
    WHERE id = auth.uid()
    AND actif = true
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- =====================================================
-- PROFILS UTILISATEURS POLICIES
-- =====================================================

-- Les utilisateurs peuvent voir leur propre profil
CREATE POLICY "Users can view own profile"
  ON profils_utilisateurs FOR SELECT
  USING (id = auth.uid());

-- Les utilisateurs actifs peuvent voir les autres profils
CREATE POLICY "Active users can view all profiles"
  ON profils_utilisateurs FOR SELECT
  USING (is_active_user());

-- Les utilisateurs peuvent mettre à jour leur propre profil (sauf le rôle)
CREATE POLICY "Users can update own profile"
  ON profils_utilisateurs FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    role = (SELECT role FROM profils_utilisateurs WHERE id = auth.uid()) -- Ne peut pas changer son propre rôle
  );

-- Les admins peuvent tout gérer
CREATE POLICY "Admins can manage all profiles"
  ON profils_utilisateurs FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================================================
-- CLIENTS POLICIES
-- =====================================================

CREATE POLICY "Active users can view clients"
  ON clients FOR SELECT
  USING (is_active_user());

CREATE POLICY "Active users can create clients"
  ON clients FOR INSERT
  WITH CHECK (is_active_user());

CREATE POLICY "Active users can update clients"
  ON clients FOR UPDATE
  USING (is_active_user())
  WITH CHECK (is_active_user());

CREATE POLICY "Admins can delete clients"
  ON clients FOR DELETE
  USING (is_admin());

-- =====================================================
-- CONTACTS POLICIES
-- =====================================================

CREATE POLICY "Active users can view contacts"
  ON contacts FOR SELECT
  USING (is_active_user());

CREATE POLICY "Active users can manage contacts"
  ON contacts FOR ALL
  USING (is_active_user())
  WITH CHECK (is_active_user());

-- =====================================================
-- OPPORTUNITES POLICIES
-- =====================================================

CREATE POLICY "Active users can view opportunites"
  ON opportunites FOR SELECT
  USING (is_active_user());

CREATE POLICY "Active users can create opportunites"
  ON opportunites FOR INSERT
  WITH CHECK (is_active_user());

CREATE POLICY "Users can update their assigned opportunites"
  ON opportunites FOR UPDATE
  USING (
    is_active_user() AND
    (assigne_a = auth.uid() OR is_admin())
  )
  WITH CHECK (
    is_active_user() AND
    (assigne_a = auth.uid() OR is_admin())
  );

CREATE POLICY "Admins can delete opportunites"
  ON opportunites FOR DELETE
  USING (is_admin());

-- =====================================================
-- ACTIVITES POLICIES
-- =====================================================

CREATE POLICY "Active users can view activites"
  ON activites FOR SELECT
  USING (is_active_user());

CREATE POLICY "Users can manage their assigned activites"
  ON activites FOR ALL
  USING (
    is_active_user() AND
    (assigne_a = auth.uid() OR is_admin())
  )
  WITH CHECK (
    is_active_user() AND
    (assigne_a = auth.uid() OR is_admin())
  );

-- =====================================================
-- DEVIS POLICIES
-- =====================================================

CREATE POLICY "Active users can view devis"
  ON devis FOR SELECT
  USING (is_active_user());

CREATE POLICY "Active users can manage devis"
  ON devis FOR ALL
  USING (is_active_user())
  WITH CHECK (is_active_user());

-- =====================================================
-- LIGNES DEVIS POLICIES
-- =====================================================

CREATE POLICY "Active users can view lignes_devis"
  ON lignes_devis FOR SELECT
  USING (is_active_user());

CREATE POLICY "Active users can manage lignes_devis"
  ON lignes_devis FOR ALL
  USING (is_active_user())
  WITH CHECK (is_active_user());

-- =====================================================
-- FACTURES POLICIES
-- =====================================================

CREATE POLICY "Active users can view factures"
  ON factures FOR SELECT
  USING (is_active_user());

CREATE POLICY "Active users can manage factures"
  ON factures FOR ALL
  USING (is_active_user())
  WITH CHECK (is_active_user());

-- =====================================================
-- LIGNES FACTURES POLICIES
-- =====================================================

CREATE POLICY "Active users can view lignes_factures"
  ON lignes_factures FOR SELECT
  USING (is_active_user());

CREATE POLICY "Active users can manage lignes_factures"
  ON lignes_factures FOR ALL
  USING (is_active_user())
  WITH CHECK (is_active_user());

-- =====================================================
-- PRODUITS POLICIES
-- =====================================================

CREATE POLICY "Active users can view produits"
  ON produits FOR SELECT
  USING (is_active_user());

CREATE POLICY "Active users can manage produits"
  ON produits FOR ALL
  USING (is_active_user())
  WITH CHECK (is_active_user());

-- =====================================================
-- DOCUMENTS POLICIES
-- =====================================================

CREATE POLICY "Active users can view documents"
  ON documents FOR SELECT
  USING (is_active_user());

CREATE POLICY "Active users can manage documents"
  ON documents FOR ALL
  USING (is_active_user())
  WITH CHECK (is_active_user());

-- =====================================================
-- NOTES POLICIES
-- =====================================================

CREATE POLICY "Active users can view notes"
  ON notes FOR SELECT
  USING (is_active_user());

CREATE POLICY "Users can create notes"
  ON notes FOR INSERT
  WITH CHECK (is_active_user());

CREATE POLICY "Users can update their own notes"
  ON notes FOR UPDATE
  USING (
    cree_par = auth.uid() OR is_admin()
  )
  WITH CHECK (
    cree_par = auth.uid() OR is_admin()
  );

CREATE POLICY "Users can delete their own notes"
  ON notes FOR DELETE
  USING (
    cree_par = auth.uid() OR is_admin()
  );

-- =====================================================
-- TAGS POLICIES
-- =====================================================

CREATE POLICY "Active users can view tags"
  ON tags FOR SELECT
  USING (is_active_user());

CREATE POLICY "Active users can manage tags"
  ON tags FOR ALL
  USING (is_active_user())
  WITH CHECK (is_active_user());

-- =====================================================
-- TAGS ENTITES POLICIES
-- =====================================================

CREATE POLICY "Active users can view tags_entites"
  ON tags_entites FOR SELECT
  USING (is_active_user());

CREATE POLICY "Active users can manage tags_entites"
  ON tags_entites FOR ALL
  USING (is_active_user())
  WITH CHECK (is_active_user());

-- =====================================================
-- GRANT ACCESS TO AUTHENTICATED USERS
-- =====================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =====================================================
-- FIN DES POLITIQUES RLS
-- =====================================================
