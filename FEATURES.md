# Turquoise CRM - Travel Agency Edition

## 🎯 Vue d'ensemble

CRM spécialement conçu pour les agences de voyage organisant des voyages de groupe et pèlerinages.

## ✨ Fonctionnalités principales

### 📊 Dashboard
- **6 KPI cards** : Leads du jour, Inscriptions en cours, Validés, Paiements en attente, Payés, CA estimé
- **Événements à venir** : Liste des prochains voyages
- **Derniers dossiers modifiés** : Activité récente

### 📅 Événements
- Liste complète de tous les événements (voyages/pèlerinages)
- Création et édition d'événements
- Vue détaillée avec onglets :
  - **Vue CRM** : Statistiques et pipeline (à venir)
  - **Chambres & prix** : Tarification par type de chambre (éditable)
  - **Dossiers** : Liste des dossiers clients liés
  - **Paiements** : Suivi des paiements (à venir)
  - **Paramètres** : Configuration avancée (à venir)

### 📋 CRM
Deux vues disponibles :

#### Pipeline Kanban (Drag & Drop)
- 7 colonnes de statut :
  1. Nouveau
  2. Inscription en cours
  3. Bulletin prêt
  4. Validé
  5. Paiement en attente
  6. Payé
  7. Annulé
- Glisser-déposer pour changer les statuts
- Cartes avec : nom client, événement, participants, chambre, prix, assigné à

#### Vue Table
- Tous les dossiers en tableau
- Filtrable et triable
- Colonnes : Référence, Client, Événement, Chambre, Prix, Statut CRM, Paiement

### 📝 Leads
- Liste des prospects non convertis
- Création manuelle de leads
- Sources : WhatsApp, Email, Manuel, Téléphone, Autre
- Conversion en dossier client d'un clic
- Filtres par source

### 📁 Dossiers Clients (Page Détail)

**Layout 2 colonnes :**

**Colonne principale (gauche) :**
- **Contact** : Nom, téléphone, email du client principal
- **Participants** : Liste éditable des voyageurs (adultes, enfants, bébés)
- **Commercial** : Type de chambre, prix total, montant payé, solde
- **Paiement** : Liens BRED envoyés et statuts
- **Facture** : Intégration Pennylane (placeholder)
- **Timeline** : Historique des activités
- **Notes internes** : Notes d'équipe

**Sidebar actions (droite) :**
- Changement rapide de statut CRM
- Envoi de lien de paiement
- Modification du prix
- Génération de facture
- Annulation du dossier

## 🗂️ Structure de la base de données

### Tables principales

#### `events`
Voyages organisés (ex: "Maurice Décembre 2026")
- `id`, `name`, `event_type`, `start_date`, `end_date`
- `destination_label`, `hotel_name`, `description`
- `status` (upcoming/ongoing/completed/cancelled)

#### `room_types`
Types de chambres disponibles
- `id`, `name`, `description`, `max_occupancy`
- Exemples : Junior Suite, Premium Suite, Family, Ocean Front

#### `event_room_pricing`
Tarification par type de chambre et par événement
- `event_id`, `room_type_id`, `price_per_person`, `deposit_amount`
- `max_occupancy`, `is_active`

#### `leads`
Prospects entrants
- `id`, `source`, `contact_name`, `contact_phone`, `contact_email`
- `event_id` (événement pressenti), `message`
- `converted_to_file_id` (null si non converti)

#### `client_files`
Dossiers clients (créés à partir des leads)
- `id`, `reference` (auto-généré), `lead_id`, `event_id`
- `crm_status` (new, in_progress, bulletin_ready, validated, payment_pending, paid, cancelled)
- `payment_status` (not_started, pending, partial, paid, refunded)
- `invoice_status` (not_generated, draft, sent, paid, overdue)
- `room_type_id`, `total_price`, `amount_paid`, `assigned_to`
- `nb_adults`, `nb_children`, `nb_babies`

#### `participants`
Voyageurs du dossier
- `id`, `client_file_id`, `first_name`, `last_name`, `date_of_birth`
- `participant_type` (adult, child, baby)

#### `payment_links`
Liens de paiement BRED
- `id`, `client_file_id`, `amount`, `payment_link`
- `status` (draft, sent, paid, cancelled), `sent_at`, `paid_at`

#### `invoices`
Factures (intégration Pennylane)
- `id`, `client_file_id`, `invoice_number`, `pennylane_invoice_id`
- `amount`, `status`, `issued_at`, `due_date`, `paid_at`

#### `activity_logs`
Historique des actions
- `id`, `client_file_id`, `action`, `details`, `created_at`

#### `internal_notes`
Notes d'équipe
- `id`, `client_file_id`, `note_text`, `created_at`

## 🚀 Pages disponibles

- ✅ `/dashboard` - Dashboard principal
- ✅ `/dashboard/evenements` - Liste des événements
- ✅ `/dashboard/evenements/nouveau` - Créer un événement
- ✅ `/dashboard/evenements/[id]` - Détail d'un événement
- ✅ `/dashboard/crm` - CRM (Pipeline + Table)
- ✅ `/dashboard/leads` - Gestion des leads
- ✅ `/dashboard/leads/nouveau` - Créer un lead
- ✅ `/dashboard/dossiers/[id]` - Détail d'un dossier client
- 🔄 `/dashboard/paiements` - Gestion des paiements (placeholder)
- 🔄 `/dashboard/utilisateurs` - Gestion des utilisateurs (placeholder)
- 🔄 `/dashboard/parametres` - Paramètres (placeholder)

## 📝 À développer

1. **Génération automatique de référence** : À partir du nom de l'événement
2. **Intégration BRED** : Génération et envoi de liens de paiement
3. **Intégration Pennylane** : Génération de factures automatique
4. **Tarification des participants** : Prix différents pour adultes/enfants/bébés
5. **Emails automatiques** : Confirmation, rappels, bulletins
6. **Export Excel/PDF** : Listes de participants, factures groupées
7. **Tableau de bord analytique** : CA par événement, taux de conversion
8. **Gestion des types de chambres** : Page paramètres complète

## 🎨 Design

- **Couleur principale** : Turquoise (#0891b2)
- **Framework** : TailwindCSS
- **Icons** : Lucide React
- **Fonts** : System fonts

## 🔐 Authentification

- Supabase Auth configuré
- RLS (Row Level Security) activé
- Profils utilisateurs avec rôles

## 🛠️ Technologies

- **Frontend** : Next.js 15, React 19, TypeScript
- **Backend** : Supabase (PostgreSQL + Auth)
- **Styling** : TailwindCSS
- **Deployment** : Prêt pour Vercel/Netlify

---

**Note** : Les pages de l'ancien CRM B2B (Clients, Contacts, Opportunités, Activités) sont toujours présentes mais ne doivent plus être utilisées. Elles seront supprimées dans une version future.
