-- =====================================================
-- TURQUOISE CRM - Données de Démonstration
-- =====================================================
-- Version: 1.0
-- Date: 2026-03-23
-- Description: Données d'exemple pour tester le CRM

-- =====================================================
-- TAGS
-- =====================================================

INSERT INTO tags (nom, couleur, description) VALUES
('VIP', '#F59E0B', 'Client à forte valeur'),
('Prioritaire', '#EF4444', 'Traitement prioritaire'),
('Prospect Chaud', '#10B981', 'Prospect très intéressé'),
('Relance', '#6366F1', 'Nécessite une relance'),
('International', '#8B5CF6', 'Client international');

-- =====================================================
-- PRODUITS
-- =====================================================

INSERT INTO produits (reference, nom, description, categorie, prix_unitaire_ht, taux_tva, unite, stock_actuel) VALUES
('CONS-001', 'Accompagnement Stratégique', 'Conseil stratégique sur mesure', 'Conseil', 1500.00, 20.00, 'jour', 0),
('FORM-001', 'Formation CRM', 'Formation à l''utilisation d''un CRM', 'Formation', 800.00, 20.00, 'jour', 0),
('AUD-001', 'Audit Commercial', 'Audit complet du processus commercial', 'Audit', 2500.00, 20.00, 'mission', 0),
('DEV-001', 'Développement sur Mesure', 'Développement de fonctionnalités personnalisées', 'Développement', 600.00, 20.00, 'jour', 0),
('SUP-001', 'Support Premium', 'Support technique premium (mensuel)', 'Support', 250.00, 20.00, 'mois', 0),
('LIC-001', 'Licence Logiciel CRM', 'Licence mensuelle par utilisateur', 'Licence', 49.00, 20.00, 'licence/mois', 100);

-- =====================================================
-- FIN DU FICHIER SEED DATA
-- =====================================================
-- 
-- Note: Les clients, contacts et opportunités de démonstration 
-- seront créés manuellement via l'interface pour tester le système.
-- 
-- Vous pouvez également ajouter vos propres données de test ici.
