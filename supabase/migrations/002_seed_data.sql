-- =====================================================
-- TURQUOISE CRM - Seed Data
-- =====================================================

-- =====================================================
-- PERMISSIONS
-- =====================================================

INSERT INTO permissions (code, label, module, description) VALUES
-- Dashboard
('view_dashboard', 'Voir le dashboard', 'dashboard', 'Accès au tableau de bord'),

-- Events
('view_events', 'Voir les événements', 'events', 'Consulter les événements'),
('create_events', 'Créer un événement', 'events', 'Créer de nouveaux événements'),
('edit_events', 'Modifier un événement', 'events', 'Modifier les événements existants'),
('delete_events', 'Supprimer un événement', 'events', 'Supprimer des événements'),
('manage_room_pricing', 'Gérer les prix des chambres', 'events', 'Configurer les types de chambres et prix'),

-- Leads
('view_leads', 'Voir les leads', 'leads', 'Consulter les leads'),
('create_leads', 'Créer un lead', 'leads', 'Créer de nouveaux leads'),
('edit_leads', 'Modifier un lead', 'leads', 'Modifier les leads'),
('delete_leads', 'Supprimer un lead', 'leads', 'Supprimer des leads'),
('convert_leads', 'Convertir un lead', 'leads', 'Convertir un lead en dossier client'),

-- Client Files
('view_client_files', 'Voir les dossiers clients', 'client_files', 'Consulter les dossiers'),
('create_client_files', 'Créer un dossier', 'client_files', 'Créer de nouveaux dossiers'),
('edit_client_files', 'Modifier un dossier', 'client_files', 'Modifier les dossiers'),
('delete_client_files', 'Supprimer un dossier', 'client_files', 'Supprimer des dossiers'),
('validate_client_files', 'Valider un dossier', 'client_files', 'Valider les dossiers en attente'),

-- Payments
('view_payments', 'Voir les paiements', 'payments', 'Consulter les paiements'),
('create_payment_links', 'Créer un lien de paiement', 'payments', 'Générer des liens de paiement'),
('mark_payment_as_paid', 'Marquer comme payé', 'payments', 'Marquer un paiement comme payé'),

-- Invoices
('view_invoices', 'Voir les factures', 'invoices', 'Consulter les factures'),
('manage_invoices', 'Gérer les factures', 'invoices', 'Créer et modifier les factures'),

-- Users & Roles
('view_users', 'Voir les utilisateurs', 'users', 'Consulter les utilisateurs'),
('create_users', 'Créer un utilisateur', 'users', 'Créer de nouveaux utilisateurs'),
('edit_users', 'Modifier un utilisateur', 'users', 'Modifier les utilisateurs'),
('delete_users', 'Supprimer un utilisateur', 'users', 'Supprimer des utilisateurs'),
('manage_roles', 'Gérer les rôles', 'roles', 'Gérer les rôles et permissions'),

-- Activity & Notes
('view_activity_logs', 'Voir l''historique', 'activity', 'Consulter l''historique des actions'),
('create_internal_notes', 'Créer une note', 'notes', 'Ajouter des notes internes'),
('edit_internal_notes', 'Modifier une note', 'notes', 'Modifier les notes internes'),
('delete_internal_notes', 'Supprimer une note', 'notes', 'Supprimer des notes internes');

-- =====================================================
-- ROLES
-- =====================================================

INSERT INTO roles (name, label, description, is_system) VALUES
('admin', 'Administrateur', 'Accès complet au système', true),
('sales', 'Commercial', 'Accès gestion commerciale', true),
('operations', 'Opérations', 'Accès gestion opérationnelle', true),
('finance', 'Finance', 'Accès gestion financière', true),
('readonly', 'Lecture seule', 'Consultation uniquement', true);

-- =====================================================
-- ROLE PERMISSIONS
-- =====================================================

-- Admin: all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'admin'),
  id
FROM permissions;

-- Sales: commercial permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'sales'),
  id
FROM permissions
WHERE code IN (
  'view_dashboard',
  'view_events',
  'view_leads', 'create_leads', 'edit_leads', 'convert_leads',
  'view_client_files', 'create_client_files', 'edit_client_files',
  'view_payments', 'create_payment_links',
  'view_invoices',
  'view_activity_logs',
  'create_internal_notes', 'edit_internal_notes'
);

-- Operations: operational permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'operations'),
  id
FROM permissions
WHERE code IN (
  'view_dashboard',
  'view_events', 'edit_events', 'manage_room_pricing',
  'view_leads',
  'view_client_files', 'edit_client_files', 'validate_client_files',
  'view_payments',
  'view_invoices',
  'view_activity_logs',
  'create_internal_notes', 'edit_internal_notes'
);

-- Finance: financial permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'finance'),
  id
FROM permissions
WHERE code IN (
  'view_dashboard',
  'view_events',
  'view_leads',
  'view_client_files',
  'view_payments', 'create_payment_links', 'mark_payment_as_paid',
  'view_invoices', 'manage_invoices',
  'view_activity_logs',
  'create_internal_notes'
);

-- Readonly: view only
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'readonly'),
  id
FROM permissions
WHERE code LIKE 'view_%';

-- =====================================================
-- DEMO EVENTS
-- =====================================================

INSERT INTO events (name, slug, event_type, status, start_date, end_date, hotel_name, destination_label, sales_open_at, sales_close_at, description) VALUES
('Maurice Décembre 2026', 'maurice-decembre-2026', 'stay', 'active', '2026-12-15', '2026-12-22', 'Constance Belle Mare Plage', 'Île Maurice', '2026-01-01', '2026-11-30', 'Séjour organisé à l''Île Maurice en décembre 2026'),
('Maurice Février 2027', 'maurice-fevrier-2027', 'stay', 'active', '2027-02-10', '2027-02-17', 'Constance Belle Mare Plage', 'Île Maurice', '2026-06-01', '2027-01-31', 'Séjour organisé à l''Île Maurice en février 2027'),
('Mariage Sophie & Marc', 'mariage-sophie-marc', 'wedding', 'draft', '2027-06-20', '2027-06-25', 'LUX* Belle Mare', 'Île Maurice', NULL, NULL, 'Organisation mariage destination');

-- =====================================================
-- ROOM TYPES & PRICING
-- =====================================================

-- Maurice Décembre 2026
DO $$
DECLARE
  event_id_dec UUID;
  rt_junior_id UUID;
  rt_premium_id UUID;
  rt_family_id UUID;
  rt_ocean_id UUID;
BEGIN
  SELECT id INTO event_id_dec FROM events WHERE slug = 'maurice-decembre-2026';
  
  -- Room Types
  INSERT INTO room_types (event_id, code, name, description, base_capacity, max_capacity, display_order)
  VALUES 
    (event_id_dec, 'JUNIOR', 'Junior Suite', 'Suite confortable avec vue jardin', 2, 2, 1)
    RETURNING id INTO rt_junior_id;
  
  INSERT INTO room_types (event_id, code, name, description, base_capacity, max_capacity, display_order)
  VALUES 
    (event_id_dec, 'PREMIUM', 'Premium Suite', 'Suite premium avec vue partielle mer', 2, 3, 2)
    RETURNING id INTO rt_premium_id;
  
  INSERT INTO room_types (event_id, code, name, description, base_capacity, max_capacity, display_order)
  VALUES 
    (event_id_dec, 'FAMILY', 'Family Suite', 'Suite familiale spacieuse', 4, 4, 3)
    RETURNING id INTO rt_family_id;
  
  INSERT INTO room_types (event_id, code, name, description, base_capacity, max_capacity, display_order)
  VALUES 
    (event_id_dec, 'OCEAN', 'Ocean Front Suite', 'Suite vue directe sur l''océan', 2, 3, 4)
    RETURNING id INTO rt_ocean_id;
  
  -- Pricing
  INSERT INTO event_room_pricing (event_id, room_type_id, label, price_amount, currency, deposit_amount)
  VALUES 
    (event_id_dec, rt_junior_id, 'Junior Suite - 2 adultes', 2500.00, 'EUR', 800.00),
    (event_id_dec, rt_premium_id, 'Premium Suite - 2 adultes', 3200.00, 'EUR', 1000.00),
    (event_id_dec, rt_family_id, 'Family Suite - 2 adultes + 2 enfants', 4500.00, 'EUR', 1500.00),
    (event_id_dec, rt_ocean_id, 'Ocean Front Suite - 2 adultes', 4200.00, 'EUR', 1400.00);
END $$;

-- Maurice Février 2027
DO $$
DECLARE
  event_id_feb UUID;
  rt_junior_id UUID;
  rt_premium_id UUID;
  rt_family_id UUID;
  rt_ocean_id UUID;
BEGIN
  SELECT id INTO event_id_feb FROM events WHERE slug = 'maurice-fevrier-2027';
  
  -- Room Types
  INSERT INTO room_types (event_id, code, name, description, base_capacity, max_capacity, display_order)
  VALUES 
    (event_id_feb, 'JUNIOR', 'Junior Suite', 'Suite confortable avec vue jardin', 2, 2, 1)
    RETURNING id INTO rt_junior_id;
  
  INSERT INTO room_types (event_id, code, name, description, base_capacity, max_capacity, display_order)
  VALUES 
    (event_id_feb, 'PREMIUM', 'Premium Suite', 'Suite premium avec vue partielle mer', 2, 3, 2)
    RETURNING id INTO rt_premium_id;
  
  INSERT INTO room_types (event_id, code, name, description, base_capacity, max_capacity, display_order)
  VALUES 
    (event_id_feb, 'FAMILY', 'Family Suite', 'Suite familiale spacieuse', 4, 4, 3)
    RETURNING id INTO rt_family_id;
  
  INSERT INTO room_types (event_id, code, name, description, base_capacity, max_capacity, display_order)
  VALUES 
    (event_id_feb, 'OCEAN', 'Ocean Front Suite', 'Suite vue directe sur l''océan', 2, 3, 4)
    RETURNING id INTO rt_ocean_id;
  
  -- Pricing (slightly different for Feb)
  INSERT INTO event_room_pricing (event_id, room_type_id, label, price_amount, currency, deposit_amount)
  VALUES 
    (event_id_feb, rt_junior_id, 'Junior Suite - 2 adultes', 2400.00, 'EUR', 750.00),
    (event_id_feb, rt_premium_id, 'Premium Suite - 2 adultes', 3100.00, 'EUR', 950.00),
    (event_id_feb, rt_family_id, 'Family Suite - 2 adultes + 2 enfants', 4300.00, 'EUR', 1400.00),
    (event_id_feb, rt_ocean_id, 'Ocean Front Suite - 2 adultes', 4000.00, 'EUR', 1300.00);
END $$;

-- =====================================================
-- DEMO USER (will be created after auth)
-- Note: This is just a placeholder
-- Real user creation happens through Supabase Auth
-- =====================================================

-- Function to create demo user (to be called after auth setup)
CREATE OR REPLACE FUNCTION create_demo_admin_user(
  p_auth_user_id UUID,
  p_email VARCHAR,
  p_first_name VARCHAR,
  p_last_name VARCHAR
)
RETURNS UUID AS $$
DECLARE
  admin_role_id UUID;
  new_user_id UUID;
BEGIN
  SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
  
  INSERT INTO users (id, email, first_name, last_name, role_id, is_active)
  VALUES (p_auth_user_id, p_email, p_first_name, p_last_name, admin_role_id, true)
  RETURNING id INTO new_user_id;
  
  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql;
