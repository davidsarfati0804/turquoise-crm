# 🚀 PLAN DE DÉVELOPPEMENT — Phase 5

> **Durée estimée** : 6-8 semaines  
> **Prérequis** : Phase 1 validée ✅

---

## 📋 CHECKLIST GLOBALE

### Foundation (Semaine 1-2)
- [ ] Setup projet Next.js 15 + TypeScript
- [ ] Configuration Supabase client (client + server)
- [ ] Migration SQL exécutée
- [ ] Système d'authentification complet
- [ ] Layout principal + navigation
- [ ] Design system (composants UI Shadcn)
- [ ] Middleware auth + guards
- [ ] Système de permissions (hooks + utils)

### Core Features (Semaine 3-4)
- [ ] Module Events (CRUD + liste + fiche)
- [ ] Module Room Types & Pricing
- [ ] Module Leads (CRUD + liste + fiche)
- [ ] Conversion Lead → ClientFile
- [ ] Module Client Files (CRUD + liste)
- [ ] Module Participants
- [ ] Formulaires avec validation Zod

### CRM & Dashboards (Semaine 5-6)
- [ ] Pipeline CRM (kanban drag & drop)
- [ ] Vue table CRM (filtres, tri, recherche)
- [ ] Dashboard global (widgets)
- [ ] Dashboard événement
- [ ] Fiche dossier complète (7 sections)
- [ ] Timeline activity log
- [ ] Notes internes

### Payments & Invoices (Semaine 7)
- [ ] Module PaymentLinks (CRUD + statuts)
- [ ] Module Invoices (préparation)
- [ ] Activity Log automatique (trigger)
- [ ] Module Users + Roles + Permissions (admin)

### Finition & Tests (Semaine 8)
- [ ] Polissage UI/UX (responsive, loading, empty states)
- [ ] Tests manuels complets (tous les flows)
- [ ] Seed data de démonstration
- [ ] Documentation utilisateur
- [ ] Déploiement Vercel staging
- [ ] Présentation démo client

---

## 🏗️ STRUCTURE À CRÉER

### `/app` — Routes Next.js

```
app/
├── layout.tsx                      # Root layout
├── globals.css                     # Tailwind + custom CSS
├── (auth)/
│   ├── layout.tsx                  # Auth layout
│   └── login/
│       └── page.tsx                # Login page
├── (dashboard)/
│   ├── layout.tsx                  # Dashboard layout (sidebar + header)
│   ├── page.tsx                    # Dashboard global
│   ├── events/
│   │   ├── page.tsx                # Liste événements
│   │   ├── [id]/
│   │   │   ├── page.tsx            # Fiche événement
│   │   │   └── settings/
│   │   │       └── page.tsx        # Chambres & prix
│   │   └── new/
│   │       └── page.tsx            # Créer événement
│   ├── leads/
│   │   ├── page.tsx                # Liste leads
│   │   ├── [id]/
│   │   │   └── page.tsx            # Fiche lead
│   │   └── new/
│   │       └── page.tsx            # Créer lead
│   ├── crm/
│   │   ├── pipeline/
│   │   │   └── page.tsx            # Pipeline kanban
│   │   └── table/
│   │       └── page.tsx            # Vue table
│   ├── client-files/
│   │   ├── page.tsx                # Liste dossiers
│   │   ├── [id]/
│   │   │   ├── page.tsx            # Fiche dossier complète ⭐
│   │   │   └── edit/
│   │   │       └── page.tsx        # Éditer dossier
│   │   └── new/
│   │       └── page.tsx            # Créer dossier
│   ├── users/
│   │   ├── page.tsx                # Liste utilisateurs
│   │   └── [id]/
│   │       └── page.tsx            # Fiche utilisateur
│   ├── roles/
│   │   └── page.tsx                # Gestion rôles & permissions
│   └── settings/
│       └── page.tsx                # Paramètres
└── api/
    └── webhooks/
        └── [...]/                  # Webhooks futurs (V2)
```

---

### `/components` — Composants UI

```
components/
├── ui/                             # Primitives Shadcn
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── input.tsx
│   ├── select.tsx
│   ├── badge.tsx
│   ├── table.tsx
│   ├── tabs.tsx
│   ├── dropdown-menu.tsx
│   ├── toast.tsx
│   └── ...
├── layout/
│   ├── sidebar.tsx                 # Sidebar navigation
│   ├── header.tsx                  # Header avec user menu
│   ├── breadcrumbs.tsx             # Fil d'ariane
│   └── page-header.tsx             # En-tête de page
└── shared/
    ├── status-badge.tsx            # Badge de statut coloré
    ├── empty-state.tsx             # État vide
    ├── loading-skeleton.tsx        # Loading skeleton
    ├── data-table.tsx              # Table réutilisable
    └── search-input.tsx            # Input recherche
```

---

### `/features` — Modules métier

#### `features/auth/`
```
auth/
├── components/
│   ├── login-form.tsx
│   └── logout-button.tsx
├── hooks/
│   ├── use-auth.ts
│   └── use-current-user.ts
├── services/
│   └── auth.service.ts
└── types.ts
```

#### `features/events/`
```
events/
├── components/
│   ├── event-card.tsx              # Card événement
│   ├── event-form.tsx              # Formulaire création/édition
│   ├── event-stats.tsx             # Stats événement
│   ├── room-pricing-table.tsx      # Table chambres & prix
│   └── room-type-form.tsx          # Formulaire chambre
├── hooks/
│   ├── use-events.ts
│   ├── use-event-mutations.ts
│   └── use-room-pricing.ts
├── services/
│   └── event.service.ts
├── types.ts
└── constants.ts
```

#### `features/leads/`
```
leads/
├── components/
│   ├── lead-card.tsx
│   ├── lead-form.tsx
│   ├── lead-table.tsx
│   └── convert-lead-dialog.tsx     # Modal conversion
├── hooks/
│   ├── use-leads.ts
│   └── use-lead-mutations.ts
├── services/
│   └── lead.service.ts
└── types.ts
```

#### `features/client-files/`
```
client-files/
├── components/
│   ├── client-file-card.tsx
│   ├── client-file-form.tsx
│   ├── client-file-detail.tsx      # Fiche complète ⭐
│   ├── participant-list.tsx
│   ├── participant-form.tsx
│   ├── payment-section.tsx
│   ├── invoice-section.tsx
│   ├── timeline.tsx                # Activity log timeline
│   └── notes-section.tsx           # Notes internes
├── hooks/
│   ├── use-client-files.ts
│   ├── use-client-file-mutations.ts
│   └── use-participants.ts
├── services/
│   ├── client-file.service.ts
│   └── participant.service.ts
└── types.ts
```

#### `features/crm/`
```
crm/
├── components/
│   ├── pipeline-board.tsx          # Kanban board ⭐
│   ├── pipeline-column.tsx         # Colonne kanban
│   ├── deal-card.tsx               # Card dossier (draggable)
│   ├── crm-table.tsx               # Table filtrable ⭐
│   └── filters-bar.tsx             # Barre de filtres
├── hooks/
│   ├── use-pipeline.ts
│   └── use-drag-and-drop.ts
└── types.ts
```

#### `features/dashboard/`
```
dashboard/
├── components/
│   ├── stats-card.tsx              # Carte stat
│   ├── recent-activity.tsx         # Activités récentes
│   ├── event-breakdown.tsx         # Répartition par événement
│   ├── status-breakdown.tsx        # Répartition par statut
│   └── quick-actions.tsx           # Actions rapides
├── hooks/
│   └── use-dashboard-stats.ts
└── services/
    └── dashboard.service.ts
```

#### `features/users/`
```
users/
├── components/
│   ├── user-form.tsx
│   ├── user-table.tsx
│   ├── role-form.tsx
│   └── permissions-matrix.tsx      # Matrice permissions
├── hooks/
│   ├── use-users.ts
│   └── use-roles.ts
└── services/
    ├── user.service.ts
    └── role.service.ts
```

---

### `/lib` — Utilities

```
lib/
├── supabase/
│   ├── client.ts                   # Client-side Supabase
│   ├── server.ts                   # Server-side Supabase
│   ├── middleware.ts               # Auth middleware
│   └── types.ts                    # Generated types
├── validations/
│   ├── event.schema.ts
│   ├── lead.schema.ts
│   ├── client-file.schema.ts
│   ├── participant.schema.ts
│   ├── payment.schema.ts
│   └── user.schema.ts
├── utils/
│   ├── format.ts                   # Format date, currency, etc.
│   ├── generate-reference.ts       # Générer référence dossier
│   ├── permissions.ts              # Guards permissions
│   ├── activity-logger.ts          # Logger activity
│   └── cn.ts                       # Class name utility
├── constants/
│   ├── statuses.ts                 # Statuts CRM/Payment/Invoice
│   ├── permissions.ts              # Liste permissions
│   ├── colors.ts                   # Couleurs statuts
│   └── routes.ts                   # Routes app
└── hooks/
    ├── use-permissions.ts
    ├── use-current-user.ts
    └── use-toast.ts
```

---

## 🎯 PRIORITÉS PAR SEMAINE

### SEMAINE 1 : Foundation Setup

**Objectif :** Application Next.js avec auth fonctionnelle

**Tâches :**
1. Initialiser projet Next.js 15 + TypeScript
2. Installer dépendances (Supabase, TailwindCSS, Shadcn, etc.)
3. Configurer Supabase clients (client + server)
4. Exécuter migrations SQL
5. Créer layout principal (sidebar + header)
6. Implémenter auth complète (login, logout, middleware)
7. Créer composants UI de base (Shadcn)
8. Setup système de permissions (hooks + guards)

**Résultat attendu :**
- ✅ Login fonctionnel
- ✅ Navigation protégée
- ✅ Layout principal responsive
- ✅ Design system opérationnel

---

### SEMAINE 2 : Events Module

**Objectif :** Gestion complète des événements

**Tâches :**
1. Page liste événements (cards + filters)
2. Page fiche événement (stats + détails)
3. Formulaire création/édition événement
4. CRUD room types
5. CRUD event room pricing
6. Services + hooks
7. Validation Zod

**Résultat attendu :**
- ✅ Admin peut créer un événement
- ✅ Admin peut configurer chambres et prix
- ✅ Dashboard événement affiche stats

---

### SEMAINE 3 : Leads Module

**Objectif :** Gestion complète des leads

**Tâches :**
1. Page liste leads (table + filters)
2. Page fiche lead
3. Formulaire création/édition lead
4. Modal conversion lead → dossier
5. Services + hooks
6. Activity log sur actions leads

**Résultat attendu :**
- ✅ Commercial peut créer un lead WhatsApp
- ✅ Commercial peut qualifier un lead
- ✅ Commercial peut convertir lead en dossier

---

### SEMAINE 4 : Client Files Module (Part 1)

**Objectif :** CRUD dossiers + participants

**Tâches :**
1. Page liste dossiers (table)
2. Formulaire création dossier
3. CRUD participants
4. Logique calcul compteurs (adults, children, babies)
5. Services + hooks
6. Validation Zod

**Résultat attendu :**
- ✅ Commercial peut créer un dossier
- ✅ Commercial peut ajouter des participants
- ✅ Sélection chambre + affichage prix

---

### SEMAINE 5 : CRM Views

**Objectif :** Pipeline kanban + table CRM

**Tâches :**
1. Pipeline board (kanban)
2. Drag & drop pour changer statuts
3. Deal cards avec infos essentielles
4. Vue table CRM (filtrable, triable)
5. Filtres avancés (événement, statut, assignation, dates)
6. Recherche globale

**Résultat attendu :**
- ✅ Pipeline CRM affiche dossiers par colonne
- ✅ Drag & drop fonctionne
- ✅ Vue table permet filtrage rapide

---

### SEMAINE 6 : Client File Detail + Dashboards

**Objectif :** Fiche dossier complète + dashboards

**Tâches :**
1. Fiche dossier complète (7 sections)
2. Timeline activity log
3. Notes internes
4. Dashboard global (widgets stats)
5. Dashboard événement (stats détaillées)

**Résultat attendu :**
- ✅ Fiche dossier affiche toutes les infos
- ✅ Timeline historise les actions
- ✅ Dashboards affichent métriques clés

---

### SEMAINE 7 : Payments & Invoices

**Objectif :** Préparation paiements et facturation

**Tâches :**
1. Module PaymentLinks (CRUD)
2. Statuts payment links
3. Section paiement dans fiche dossier
4. Module Invoices (préparation)
5. Statuts invoices
6. Module Users + Roles + Permissions (admin)

**Résultat attendu :**
- ✅ Commercial peut créer un lien de paiement
- ✅ Commercial peut marquer comme payé
- ✅ Admin peut gérer users/roles

---

### SEMAINE 8 : Polissage & Tests

**Objectif :** Finition et validation

**Tâches :**
1. Responsive design (mobile/tablet)
2. Loading states partout
3. Empty states
4. Toasts notifications
5. Tests manuels complets (tous les flows)
6. Fix bugs
7. Documentation utilisateur
8. Déploiement Vercel staging
9. Démo client

**Résultat attendu :**
- ✅ MVP fonctionnel à 100%
- ✅ Interface premium et fluide
- ✅ Tous les flows validés
- ✅ Déployé en staging

---

## ⚙️ COMMANDES DE DÉVELOPPEMENT

```bash
# Installation
npm install

# Développement local
npm run dev

# Build production
npm run build

# Linter
npm run lint

# Format code
npm run format

# Type check
npm run type-check

# Supabase (si CLI installée)
supabase start       # Local dev
supabase db push     # Push migrations
supabase db reset    # Reset DB
```

---

## 🧪 TESTS À FAIRE (Semaine 8)

### Flow 1 : Création événement
- [ ] Admin peut créer un événement
- [ ] Admin peut ajouter types de chambres
- [ ] Admin peut définir prix par chambre
- [ ] Admin peut activer l'événement
- [ ] Dashboard affiche l'événement

### Flow 2 : Lead → Dossier
- [ ] Commercial peut créer un lead WhatsApp
- [ ] Commercial peut qualifier le lead
- [ ] Commercial peut convertir en dossier
- [ ] Dossier est créé avec référence auto
- [ ] Lead status = converted

### Flow 3 : Dossier complet
- [ ] Commercial peut ajouter participants
- [ ] Commercial peut sélectionner chambre
- [ ] Prix s'affiche automatiquement
- [ ] Commercial peut changer statuts
- [ ] Timeline historise les actions

### Flow 4 : Pipeline CRM
- [ ] Pipeline affiche dossiers par statut
- [ ] Drag & drop fonctionne
- [ ] Statut se met à jour
- [ ] Activity log enregistre

### Flow 5 : Paiement
- [ ] Commercial peut créer PaymentLink
- [ ] Commercial peut marquer comme payé
- [ ] Payment status se met à jour
- [ ] amount_paid calculé

### Flow 6 : Permissions
- [ ] Admin voit tout
- [ ] Sales voit leads + dossiers
- [ ] Readonly ne peut pas modifier
- [ ] Unauthorized → redirect login

---

## 📦 DÉPENDANCES À INSTALLER

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@supabase/supabase-js": "^2.39.0",
    "@supabase/auth-helpers-nextjs": "^0.9.0",
    "react-hook-form": "^7.49.0",
    "zod": "^3.22.4",
    "@hookform/resolvers": "^3.3.4",
    "zustand": "^4.4.7",
    "@tanstack/react-query": "^5.17.0",
    "lucide-react": "^0.303.0",
    "date-fns": "^3.0.6",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.2"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "tailwindcss": "^3.4.1",
    "postcss": "^8.4.33",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.56.0",
    "eslint-config-next": "^15.0.0",
    "prettier": "^3.1.1",
    "prettier-plugin-tailwindcss": "^0.5.11",
    "@types/node": "^20.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "supabase": "^1.142.0"
  }
}
```

---

## 🚀 GO / NO GO

**Avant de démarrer le développement, confirmer :**

- [ ] Architecture validée (Phase 1)
- [ ] Schéma SQL validé
- [ ] User flows validés
- [ ] Design system validé
- [ ] Environnement dev prêt (Node, npm, VS Code)
- [ ] Compte Supabase créé
- [ ] Migrations SQL exécutées
- [ ] Premier user admin créé
- [ ] Planning 6-8 semaines OK

**Si tout est ✅ → START DEVELOPMENT**

---

**READY TO CODE ? 🎯**
