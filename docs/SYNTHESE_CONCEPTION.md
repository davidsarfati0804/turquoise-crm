# 📊 SYNTHÈSE DE CONCEPTION — TURQUOISE CRM

> **Phase 1 : Architecture & Modélisation — TERMINÉE**  
> **Date** : 23 mars 2026  
> **Statut** : En attente de validation avant développement

---

## ✅ LIVRABLES PHASE 1

### 1. Reformulation du besoin ✓

**Problème métier :**
Agence de voyage premium qui gère des événements commerciaux (séjours organisés, mariages) et doit structurer son processus de vente depuis le lead WhatsApp jusqu'au paiement/facturation, avec la particularité de gérer plusieurs événements en parallèle ayant chacun leurs propres prix et disponibilités.

**Contraintes majeures :**
- Multi-événements en parallèle
- Prix par événement × type de chambre (non global)
- Human-in-the-loop (pas d'automatisation complète en V1)
- Architecture évolutive pour V2/V3

---

### 2. Hypothèses validées ✓

| Hypothèse | Justification |
|-----------|---------------|
| Un dossier = une réservation | Un contact principal réserve pour plusieurs participants |
| Prix événement-dépendants | Même chambre peut avoir des prix différents selon l'événement |
| Lead → Dossier manuel | Conversion humaine avec bouton "Convertir" |
| Référence auto-générée | Format `EVENT-YYYY-NNNN` (ex: `MAU-2026-0042`) |
| Multi-chambres = V2 | V1 = 1 dossier = 1 type de chambre |
| Inventaire simple V1 | Compteurs par type, pas de numéros réels |
| Statuts séparés | CRM / Payment / Invoice indépendants |

---

### 3. Découpage V1 / V2 / V3 ✓

**V1 — CRM Opérationnel (6-8 semaines)**
- ✅ CRUD événements complet
- ✅ Types chambres + pricing par événement
- ✅ CRUD leads + conversion
- ✅ CRUD dossiers + participants
- ✅ Pipeline CRM visuel (kanban)
- ✅ Vue table filtrable
- ✅ Dashboards
- ✅ Préparation paiements (manuel)
- ✅ Préparation facturation (statuts)
- ✅ Users + roles + permissions
- ✅ Activity log + notes internes

**V2 — Automatisation (4-6 semaines)**
- 🔄 WhatsApp Business API
- 🔄 BRED Payment API
- 🔄 Pennylane Invoicing
- 🔄 Templates messages
- 🔄 Bulletin d'inscription PDF
- 🔄 Notifications

**V3 — Modules Avancés (8-12 semaines)**
- 🚀 Room assignment détaillé
- 🚀 Mini-club, excursions, stock
- 🚀 Espace client
- 🚀 Analytics avancés

---

### 4. Schéma conceptuel des entités ✓

**Entités principales (14) :**

1. **Event** — Événement commercial principal
2. **RoomType** — Types de chambres par événement
3. **EventRoomPricing** — Prix par événement × chambre
4. **Lead** — Demande entrante
5. **ClientFile** — Dossier client (inscription)
6. **Participant** — Participants du dossier
7. **PaymentLink** — Lien de paiement
8. **Invoice** — Facture
9. **User** — Utilisateur interne
10. **Role** — Rôle utilisateur
11. **Permission** — Permission granulaire
12. **RolePermission** — Association N:N
13. **ActivityLog** — Historique actions
14. **InternalNote** — Notes internes

**Relations clés :**
- Event `1:N` RoomType
- Event `1:N` EventRoomPricing
- Event `1:N` Lead
- Event `1:N` ClientFile
- Lead `1:1` ClientFile (conversion)
- ClientFile `1:N` Participant
- ClientFile `1:N` PaymentLink
- ClientFile `1:N` Invoice
- User `N:1` Role
- Role `N:N` Permission

---

### 5. User flows clés ✓

**Flow 1 : Création événement complet**
```
Admin crée événement (draft)
  → Configure types de chambres
  → Définit prix par type
  → Active événement
  → Visible dans dashboard
```

**Flow 2 : Lead WhatsApp → Dossier → Paiement**
```
Client WhatsApp contact
  → Commercial crée lead
  → Qualification
  → Conversion en dossier
  → Ajout participants
  → Sélection chambre/prix
  → Préparation bulletin
  → Validation manager
  → Préparation paiement (lien BRED manuel)
  → Envoi WhatsApp
  → Confirmation paiement
  → Activity log + update statuts
  → Préparation facturation future
```

**Flow 3 : Pipeline CRM**
```
Commercial ouvre vue Pipeline
  → Voit cartes par colonne (statuts)
  → Drag & drop pour changer statut
  → Click carte → fiche complète
  → Filtres : événement, assignation, dates
```

---

### 6. Architecture technique ✓

**Stack validée :**
- Frontend : Next.js 15 (App Router) + TypeScript + TailwindCSS + Shadcn/ui
- Backend : Supabase (PostgreSQL + Auth + RLS)
- Forms : React Hook Form + Zod
- State : Zustand + TanStack Query

**Structure modulaire :**
```
app/          → Routes Next.js
components/   → UI réutilisables
features/     → Modules métier (events, leads, client-files, crm, dashboard)
lib/          → Utilities, Supabase, validations, permissions
supabase/     → Migrations SQL
```

**Séparation responsabilités :**
- UI : components/ + features/*/components/
- Business Logic : features/*/services/
- Data Access : lib/supabase/ + server actions
- Validation : lib/validations/ (Zod)
- Auth : lib/utils/permissions.ts + RLS

---

### 7. Structure des tables Supabase ✓

**Fichiers SQL créés :**

1. **`001_initial_schema.sql`** (tables, relations, indexes, triggers)
   - 14 tables avec UUID primary keys
   - Clés étrangères + constraints
   - Enums pour statuts
   - Triggers `updated_at`
   - Function `generate_file_reference()`
   - Indexes optimisés

2. **`002_seed_data.sql`** (données de démonstration)
   - Permissions (30+)
   - Rôles (admin, sales, operations, finance, readonly)
   - RolePermissions (mapping)
   - 2 événements de démo (Maurice Déc 2026, Maurice Fév 2027)
   - Types de chambres + pricing
   - Function `create_demo_admin_user()`

3. **`003_rls_policies.sql`** (sécurité Row Level Security)
   - RLS activé sur toutes les tables
   - Functions helper (has_permission, is_admin, etc.)
   - Policies granulaires par table et action
   - Protection complète

---

## 🎨 DESIGN SYSTEM

### Palette de couleurs

**Turquoise/Lagon (principal) :**
- `--turquoise-400`: #2dd4bf (principal)
- `--turquoise-600`: #0d9488 (CTA, liens)
- `--turquoise-50 → 900` : dégradés

**Neutres :**
- `--gray-50`: #fafafa (background)
- `--gray-800`: #262626 (texte)
- `--gray-900`: #171717 (titres)

**Sémantiques :**
- Success : #22c55e (vert)
- Warning : #f59e0b (orange)
- Error : #ef4444 (rouge)
- Info : #3b82f6 (bleu)

### Badges de statuts

**CRM Status :**
- `new_lead` : gris
- `inscription_in_progress` : turquoise
- `validated` : vert
- `cancelled` : rouge
- etc. (8 statuts)

**Payment Status :**
- `pending` : orange
- `paid` : vert
- etc. (6 statuts)

**Invoice Status :**
- `created` : violet
- `sent` : orange
- `paid` : vert
- etc. (5 statuts)

### Typography
- Font : Inter, system fonts
- Display (h1) : 40px, bold
- Body : 16px, normal
- Small : 14px

---

## 🔒 SÉCURITÉ & PERMISSIONS

### Système de permissions

**30+ permissions définies :**
- `view_*` : consultation
- `create_*` : création
- `edit_*` : modification
- `delete_*` : suppression
- `manage_*` : gestion complète
- `validate_*` : validation

**Modules :**
- dashboard, events, leads, client_files
- payments, invoices, users, roles
- activity, notes

### Row Level Security (RLS)

- Toutes les tables protégées
- Policies basées sur permissions
- Functions helper (`has_permission()`, `is_admin()`)
- Protection serveur + client

---

## 📱 ÉCRANS PRINCIPAUX

**17 écrans minimum :**
1. Login
2. Dashboard global
3. Liste événements
4. Fiche événement
5. Vue pipeline CRM (kanban)
6. Vue table CRM
7. Liste leads
8. Fiche lead
9. Liste dossiers clients
10. Fiche dossier client complète ⭐
11. Création/édition événement
12. Création/édition dossier
13. Gestion chambres & prix
14. Utilisateurs
15. Rôles & permissions
16. Historique / logs
17. Paramètres intégrations

**Écran central : Fiche dossier client**
- En-tête (référence, statuts, badges)
- Contact principal
- Participants (liste, type, âge)
- Commercial (chambre, prix, montants)
- Paiement (liens, statuts, historique)
- Facturation (statut, future intégration)
- Timeline (activity log)
- Notes internes

---

## 📈 STATUTS CRM

### CRM Status (8 statuts)
```
new_lead
  → qualification_in_progress
  → inscription_in_progress
  → bulletin_ready
  → waiting_internal_validation
  → validated
  → completed
  → cancelled
```

### Payment Status (6 statuts)
```
not_sent
  → pending
  → partially_paid
  → paid
  → failed
  → refunded
```

### Invoice Status (5 statuts)
```
not_created
  → pending
  → created
  → sent
  → paid
```

---

## 🚀 POINTS D'EXTENSION V2+

### Architecture extensible

**Préparé mais non implémenté en V1 :**
- Event hooks / emitter pattern
- Provider abstraction (payments, invoices)
- Webhook endpoints (API routes)
- Templates système (messages)

**Dossiers futurs :**
```
features/integrations/
├── whatsapp/
├── bred/
└── pennylane/
```

**Tables futures (V3) :**
- `room_assignments`
- `excursions`
- `mini_club_bookings`
- `on_site_stock`
- `client_portal_access`

---

## 📚 DOCUMENTATION CRÉÉE

**Fichiers livrés :**

1. ✅ `supabase/migrations/001_initial_schema.sql` — Schéma complet
2. ✅ `supabase/migrations/002_seed_data.sql` — Données de démo
3. ✅ `supabase/migrations/003_rls_policies.sql` — Sécurité RLS
4. ✅ `docs/ARCHITECTURE_COMPLETE.md` — Architecture technique complète (7000+ mots)
5. ✅ `.env.local.example` — Template variables d'environnement
6. ✅ `README.md` — Installation et setup complet

---

## 🎯 VALIDATION REQUISE

**Avant de passer au développement, veuillez valider :**

### ✅ Points à confirmer

1. **Modèle de données**
   - [ ] Les 14 entités couvrent bien les besoins V1
   - [ ] Relations entre entités cohérentes
   - [ ] Statuts CRM/Payment/Invoice adaptés

2. **User flows**
   - [ ] Flow Lead → Dossier → Paiement cohérent
   - [ ] Création événement + pricing adapté
   - [ ] Pipeline CRM correspond aux attentes

3. **UX/UI**
   - [ ] Palette turquoise/lagon validée
   - [ ] 17 écrans couvrent les besoins
   - [ ] Fiche dossier client suffisamment complète

4. **Permissions**
   - [ ] 5 rôles (admin, sales, operations, finance, readonly) OK
   - [ ] 30+ permissions suffisantes
   - [ ] RLS adapté

5. **Extensions futures**
   - [ ] Architecture extensible validée
   - [ ] Points d'intégration WhatsApp/BRED/Pennylane clairs

### ❓ Questions / Clarifications

**Si vous avez des questions ou ajustements :**
- Points métier à préciser ?
- Statuts à ajouter/modifier ?
- Écrans manquants ?
- Permissions à ajuster ?

---

## 🚦 PROCHAINES ÉTAPES

### Si validation OK → Développement (ÉTAPE 5)

**Phase de développement (6-8 semaines) :**

1. **Semaine 1-2 : Foundation**
   - Setup Next.js + Supabase
   - Système d'auth complet
   - Layout + navigation
   - Design system (composants UI)

2. **Semaine 3-4 : Core Features**
   - Module Events complet
   - Module Leads complet
   - Module Client Files (CRUD)
   - Module Participants

3. **Semaine 5-6 : CRM & Dashboard**
   - Pipeline CRM (kanban)
   - Vue table CRM
   - Dashboard global
   - Dashboard événement
   - Fiche dossier complète

4. **Semaine 7 : Payments & Invoices**
   - Préparation PaymentLinks
   - Préparation Invoices
   - Activity Log
   - Internal Notes

5. **Semaine 8 : Finition & Tests**
   - Users + Roles + Permissions
   - Polissage UI/UX
   - Tests manuels complets
   - Documentation utilisateur
   - Déploiement staging

---

## 📊 MÉTRIQUES DE SUCCÈS V1

**Critères de validation du MVP :**

1. ✅ Un admin peut créer un événement avec chambres et prix
2. ✅ Un commercial peut créer un lead WhatsApp
3. ✅ Un commercial peut convertir un lead en dossier
4. ✅ Un commercial peut ajouter des participants à un dossier
5. ✅ Un commercial peut sélectionner une chambre et voir le prix
6. ✅ Le pipeline CRM affiche les dossiers par statut
7. ✅ Le drag & drop fonctionne pour changer les statuts
8. ✅ Un commercial peut créer un lien de paiement manuel
9. ✅ Les statuts sont historisés dans l'activity log
10. ✅ Les dashboards affichent les métriques clés
11. ✅ Les permissions fonctionnent (admin vs sales vs readonly)
12. ✅ L'interface est fluide, premium, turquoise

---

## 🎬 CONCLUSION PHASE 1

**Résumé :**
- ✅ Besoin métier clarifié
- ✅ Architecture technique validée
- ✅ Modèle de données complet (14 tables)
- ✅ 3 fichiers SQL migrations prêts
- ✅ User flows détaillés
- ✅ Design system défini
- ✅ Documentation complète (7000+ mots)
- ✅ Points d'extension V2/V3 préparés

**Livrables techniques :**
- 6 fichiers créés (SQL migrations, docs, README, .env.example)
- 0 ligne de code applicatif (volontairement, attente validation)

**Temps de conception :** ~3-4 heures de réflexion et modélisation

**Prêt pour validation client** ✅

---

**ATTENDONS VOTRE RETOUR POUR DÉMARRER LE DÉVELOPPEMENT (ÉTAPE 5)**

Si tout est validé, je génère le code complet du MVP en suivant exactement cette architecture.

Si ajustements nécessaires, précisez les points à modifier.

**À vous ! 🎯**
