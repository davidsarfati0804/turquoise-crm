
# 🏝️ Turquoise CRM

CRM métier sur-mesure pour agence de voyage premium — Gestion d'événements, leads, inscriptions, paiements et facturation.

## 📋 Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Stack technique](#stack-technique)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Déploiement](#déploiement)
- [Documentation](#documentation)
- [Roadmap](#roadmap)

---

## Vue d'ensemble

### Objectif

Application CRM interne pour gérer le cycle commercial complet d'une agence de voyage premium :
- **Événements** : séjours organisés, mariages, voyages sur-mesure
- **Leads** : demandes entrantes (WhatsApp, téléphone, email)
- **Dossiers clients** : inscriptions, participants, réservations
- **Pipeline commercial** : suivi des statuts CRM (kanban + table)
- **Paiements** : liens de paiement, acomptes, soldes
- **Facturation** : préparation intégration Pennylane

### Fonctionnalités V1

✅ Gestion multi-événements avec types de chambres et prix spécifiques  
✅ Capture et qualification des leads  
✅ Conversion lead → dossier client  
✅ Pipeline CRM visuel (kanban) + vue table filtrable  
✅ Fiche dossier complète (participants, commercial, paiements)  
✅ Gestion des participants (adultes, enfants, bébés)  
✅ Préparation liens de paiement (manuel V1, API V2)  
✅ Préparation facturation (Pennylane V2)  
✅ Dashboard global + dashboard événement  
✅ Gestion utilisateurs, rôles et permissions  
✅ Activity log automatique  
✅ Notes internes  
✅ Authentification Supabase + RLS  

---

## Stack technique

### Frontend
- **Next.js 15** — App Router + React Server Components
- **TypeScript** — Mode strict
- **TailwindCSS** — Styling
- **Shadcn/ui** — Composants UI
- **React Hook Form + Zod** — Formulaires et validation
- **TanStack Query** — Server state management

### Backend & Database
- **Supabase** — PostgreSQL + Auth + Storage + Realtime
- **Next.js Server Actions** — Mutations
- **Row Level Security (RLS)** — Sécurité granulaire

### Dev Tools
- **ESLint + Prettier** — Code quality
- **Husky** — Git hooks
- **TypeScript strict** — Type safety

---

## Prérequis

- **Node.js** : 18.17+ ou 20.x (recommandé)
- **npm** : 9.x+ ou **pnpm** (recommandé)
- **Git** : 2.x+
- **Compte Supabase** : [supabase.com](https://supabase.com)
- **VS Code** (recommandé) avec extensions :
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense

---

## Installation

### 1. Clone le repository

```bash
git clone https://github.com/votre-org/turquoise-crm.git
cd turquoise-crm
```

### 2. Installer les dépendances

```bash
npm install
# ou
pnpm install
```

### 3. Configuration des variables d'environnement

```bash
cp .env.local.example .env.local
```

Éditez `.env.local` et remplissez les valeurs (voir section [Configuration](#configuration)).

---

## Configuration

### 1. Créer un projet Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Créez un nouveau projet
3. Attendez que le projet soit provisionné (2-3 minutes)

### 2. Récupérer les credentials Supabase

Dans votre projet Supabase :
1. Allez dans **Settings** → **API**
2. Copiez les valeurs suivantes :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **Attention** : Ne commitez JAMAIS votre `SUPABASE_SERVICE_ROLE_KEY` !

### 3. Exécuter les migrations SQL

Dans l'interface Supabase :
1. Allez dans **SQL Editor**
2. Créez une nouvelle query
3. Copiez le contenu de `supabase/migrations/001_initial_schema.sql`
4. Exécutez
5. Répétez pour `002_seed_data.sql` et `003_rls_policies.sql`

Alternativement, via Supabase CLI :

```bash
# Installer Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### 4. Créer votre premier utilisateur admin

1. Dans Supabase, allez dans **Authentication** → **Users**
2. Cliquez **Add user** → **Create new user**
3. Email : `admin@turquoise-crm.local` (ou votre email)
4. Password : `UnMotDePasseSecurise123!`
5. Confirmez

Ensuite, dans **SQL Editor**, exécutez :

```sql
-- Remplacez l'UUID par celui de votre user créé
SELECT create_demo_admin_user(
  'uuid-de-votre-user'::uuid,
  'admin@turquoise-crm.local',
  'Admin',
  'Turquoise'
);
```

### 5. Lancer l'application

```bash
npm run dev
# ou
pnpm dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

### 6. Se connecter

- Email : `admin@turquoise-crm.local`
- Password : celui que vous avez défini

🎉 **Vous êtes prêt !**

---

## Structure du projet

```
turquoise-crm/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Routes publiques (login)
│   ├── (dashboard)/         # Routes protégées (CRM)
│   └── api/                 # API routes
├── components/              # Composants UI réutilisables
│   ├── ui/                  # Primitives (shadcn)
│   ├── layout/              # Layout components
│   └── shared/              # Composants partagés
├── features/                # Modules métier
│   ├── events/
│   ├── leads/
│   ├── client-files/
│   ├── crm/
│   ├── dashboard/
│   └── auth/
├── lib/                     # Utilities & config
│   ├── supabase/            # Supabase clients
│   ├── validations/         # Zod schemas
│   ├── utils/               # Helpers
│   └── constants/           # Constantes
├── supabase/                # SQL migrations & seeds
│   └── migrations/
├── docs/                    # Documentation
│   └── ARCHITECTURE_COMPLETE.md
├── public/                  # Assets statiques
├── .env.local.example       # Template variables env
└── README.md                # Ce fichier
```

---

## Déploiement

### Vercel (recommandé)

1. Pushez votre code sur GitHub
2. Connectez votre repo à [Vercel](https://vercel.com)
3. Ajoutez les variables d'environnement :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (URL de production)
4. Déployez

### Autres plateformes

Compatible avec :
- **Netlify**
- **Railway**
- **Fly.io**
- **AWS Amplify**

---

## Documentation

- **Architecture complète** : [docs/ARCHITECTURE_COMPLETE.md](docs/ARCHITECTURE_COMPLETE.md)
- **Schéma de base de données** : [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql)
- **Permissions & RLS** : [supabase/migrations/003_rls_policies.sql](supabase/migrations/003_rls_policies.sql)

---

## Roadmap

### ✅ V1 — CRM Opérationnel (actuel)
- Gestion événements, leads, dossiers
- Pipeline CRM visuel
- Préparation paiements/facturation
- Permissions & rôles

### 🔄 V2 — Automatisation & Intégrations (Q2 2026)
- Intégration WhatsApp Business API
- Intégration BRED (paiements automatiques)
- Intégration Pennylane (facturation synchronisée)
- Templates de messages
- Génération bulletin d'inscription PDF
- Notifications in-app

### 🚀 V3 — Modules Avancés (Q3-Q4 2026)
- Room assignment (numéros de chambres)
- Rooming list opérationnelle
- Gestion mini-club
- Stock sur place
- Excursions / activités
- Espace client
- Signature électronique
- Analytics avancés

---

## Support

Pour toute question ou problème :
- 📧 Email : support@turquoise-crm.com
- 📚 Documentation : [docs/](docs/)
- 🐛 Issues : [GitHub Issues](https://github.com/votre-org/turquoise-crm/issues)

---

## Licence

Propriétaire — Usage interne uniquement

© 2026 Club Turquoise. Tous droits réservés.