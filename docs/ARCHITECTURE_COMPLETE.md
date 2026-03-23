# TURQUOISE CRM - Architecture Technique Complète

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Stack technique](#stack-technique)
3. [Structure du projet](#structure-du-projet)
4. [Modèle de données](#modèle-de-données)
5. [Authentification & Permissions](#authentification--permissions)
6. [Composants clés](#composants-clés)
7. [User Flows détaillés](#user-flows-détaillés)
8. [Design System](#design-system)
9. [Conventions de code](#conventions-de-code)
10. [Stratégie d'extension](#stratégie-dextension)

---

## Vue d'ensemble

### Objectif
CRM métier sur-mesure pour agence de voyage premium gérant des événements (séjours organisés, mariages) avec gestion complète du cycle commercial : lead → inscription → paiement → facturation.

### Contraintes métier
- **Multi-événements** : plusieurs événements en parallèle avec prix/chambres spécifiques
- **Human-in-the-loop** : assistance humaine, pas d'automatisation complète en V1
- **Évolutivité** : architecture extensible pour intégrations futures (WhatsApp, BRED, Pennylane)

---

## Stack technique

### Frontend
```
Next.js 15            App Router + React 19
TypeScript            Mode strict
TailwindCSS           Styling
Shadcn/ui             Composants base
React Hook Form       Gestion formulaires
Zod                   Validation schémas
Zustand               State management
TanStack Query        Server state
Lucide React          Icônes
```

### Backend & Database
```
Supabase              PostgreSQL + Auth + Storage + Realtime
Next.js Server Actions Mutations
API Routes            Webhooks futurs
Row Level Security    Sécurité granulaire
```

### Dev Tools
```
ESLint + Prettier     Code quality
Husky                 Git hooks
TypeScript strict     Type safety
```

---

## Structure du projet

Voir fichier `ARCHITECTURE.md` complet dans le dossier `/docs`.

**Principes d'organisation :**
- `/app` : routes Next.js (App Router)
- `/components` : composants UI réutilisables
- `/features` : modules métier (events, leads, client-files, etc.)
- `/lib` : utilities, validations, Supabase clients
- `/supabase` : migrations, seeds, config

**Séparation des responsabilités :**
- **UI** : components/ + features/*/components/
- **Business Logic** : features/*/services/
- **Data Access** : lib/supabase/ + server actions
- **Validation** : lib/validations/ (Zod schemas)
- **Auth/Permissions** : lib/utils/permissions.ts + RLS

---

## Modèle de données

### Entités principales

#### 1. **Event** (Événement)
```typescript
{
  id: UUID
  name: string                    // "Maurice Décembre 2026"
  slug: string                    // "maurice-decembre-2026"
  event_type: 'stay' | 'wedding' | 'other'
  status: 'draft' | 'active' | 'archived'
  start_date: Date
  end_date: Date
  hotel_name: string
  destination_label: string
  sales_open_at: DateTime
  sales_close_at: DateTime
  description: text
  notes: text
}
```

**Relations :**
- `1:N` avec RoomType
- `1:N` avec Lead
- `1:N` avec ClientFile

---

#### 2. **RoomType** (Type de chambre)
```typescript
{
  id: UUID
  event_id: UUID                  // FK → events
  code: string                    // "JUNIOR", "PREMIUM"
  name: string                    // "Junior Suite"
  description: text
  base_capacity: integer          // 2
  max_capacity: integer           // 2
  is_active: boolean
  display_order: integer
}
```

**Logique :** chaque événement définit ses propres types de chambres disponibles.

---

#### 3. **EventRoomPricing** (Prix par événement × chambre)
```typescript
{
  id: UUID
  event_id: UUID                  // FK → events
  room_type_id: UUID              // FK → room_types
  label: string                   // "Junior Suite - 2 adultes"
  price_amount: decimal(10,2)     // 2500.00
  currency: 'EUR' | 'USD' | 'GBP'
  deposit_amount: decimal(10,2)   // 800.00 (nullable)
  notes: text
}
```

**Contrainte unique :** (event_id, room_type_id)

**Logique :** le prix n'est pas global au type de chambre, il est défini pour chaque événement.

---

#### 4. **Lead** (Demande entrante)
```typescript
{
  id: UUID
  event_id: UUID                  // FK → events (nullable)
  source: 'whatsapp' | 'phone' | 'email' | 'manual' | 'other'
  status: 'new' | 'qualified' | 'converted' | 'lost'
  primary_contact_name: string
  primary_contact_phone: string
  primary_contact_email: string
  raw_message: text               // Message WhatsApp brut
  internal_summary: text
  assigned_to_user_id: UUID       // FK → users
  converted_to_client_file_id: UUID // FK → client_files (nullable)
}
```

**Workflow :** Lead → qualification → conversion en ClientFile

---

#### 5. **ClientFile** (Dossier client)
```typescript
{
  id: UUID
  event_id: UUID                  // FK → events
  lead_id: UUID                   // FK → leads (nullable)
  file_reference: string          // "MAU-2026-0042" (unique)
  
  // Statuts
  crm_status: CRMStatus
  payment_status: PaymentStatus
  invoice_status: InvoiceStatus
  
  // Contact principal
  primary_contact_first_name: string
  primary_contact_last_name: string
  primary_contact_phone: string
  primary_contact_email: string
  
  // Commercial
  total_participants: integer
  adults_count: integer
  children_count: integer
  babies_count: integer
  selected_room_type_id: UUID     // FK → room_types
  quoted_price: decimal(10,2)
  amount_paid: decimal(10,2)
  balance_due: decimal(10,2)
  
  notes: text
  
  // Tracking
  created_by_user_id: UUID        // FK → users
  assigned_to_user_id: UUID       // FK → users
}
```

**Relations :**
- `1:N` avec Participant
- `1:N` avec PaymentLink
- `1:N` avec Invoice

---

#### 6. **Participant**
```typescript
{
  id: UUID
  client_file_id: UUID            // FK → client_files
  first_name: string
  last_name: string
  age: integer
  participant_type: 'adult' | 'child' | 'baby'
  birth_date: Date
  notes: text
  display_order: integer
}
```

---

#### 7. **PaymentLink** (Lien de paiement)
```typescript
{
  id: UUID
  client_file_id: UUID            // FK → client_files
  provider: string                // "bred_manual" en V1
  url: text                       // URL BRED collée manuellement
  amount: decimal(10,2)
  currency: 'EUR' | 'USD' | 'GBP'
  status: 'draft' | 'sent' | 'paid' | 'expired' | 'cancelled'
  sent_at: DateTime
  paid_at: DateTime
  external_reference: string
  notes: text
  created_by_user_id: UUID
}
```

---

#### 8. **Invoice** (Facture)
```typescript
{
  id: UUID
  client_file_id: UUID            // FK → client_files
  provider: string                // "pennylane_future" (placeholder V1)
  status: 'not_created' | 'pending' | 'created' | 'sent' | 'paid'
  external_invoice_id: string     // ID Pennylane futur
  invoice_number: string
  amount: decimal(10,2)
  currency: 'EUR' | 'USD' | 'GBP'
  issued_at: DateTime
  due_at: DateTime
  pdf_url: text
  notes: text
}
```

---

#### 9. **User** + **Role** + **Permission**
```typescript
User {
  id: UUID                        // = auth.users.id
  first_name: string
  last_name: string
  email: string
  role_id: UUID                   // FK → roles
  is_active: boolean
  avatar_url: text
}

Role {
  id: UUID
  name: string                    // "admin", "sales", "operations"
  label: string
  description: text
  is_system: boolean
}

Permission {
  id: UUID
  code: string                    // "view_events", "edit_leads"
  label: string
  module: string                  // "events", "leads"
  description: text
}

RolePermission {
  role_id: UUID
  permission_id: UUID
}
```

---

#### 10. **ActivityLog** + **InternalNote**
```typescript
ActivityLog {
  id: UUID
  actor_user_id: UUID
  entity_type: string             // "client_file", "lead"
  entity_id: UUID
  action_type: string             // "created", "updated", "status_changed"
  action_label: string
  metadata: JSONB
  created_at: DateTime
}

InternalNote {
  id: UUID
  entity_type: string
  entity_id: UUID
  content: text
  created_by_user_id: UUID
  created_at: DateTime
  updated_at: DateTime
}
```

---

## Authentification & Permissions

### Système d'authentification

**Supabase Auth** :
- Email/Password
- Magic Link (optionnel V2)
- Google OAuth (optionnel V2)

**Flow :**
```
1. User s'inscrit via Supabase Auth
2. Trigger crée automatiquement ligne dans table `users`
3. Admin assigne un rôle
4. Permissions calculées via jointure role_permissions
```

---

### Système de permissions

**Modules :**
- `dashboard`
- `events`
- `leads`
- `client_files`
- `payments`
- `invoices`
- `users`
- `roles`
- `activity`
- `notes`

**Actions typiques :**
- `view_*` : consultation
- `create_*` : création
- `edit_*` : modification
- `delete_*` : suppression
- `manage_*` : gestion complète

**Exemples de permissions :**
- `view_events`
- `create_leads`
- `edit_client_files`
- `validate_client_files`
- `create_payment_links`
- `manage_invoices`
- `manage_users`

---

### Rôles par défaut

| Rôle | Description | Permissions clés |
|------|-------------|------------------|
| **admin** | Administrateur complet | Toutes permissions |
| **sales** | Commercial | Leads, dossiers, paiements (view) |
| **operations** | Opérations | Événements, validation dossiers |
| **finance** | Finance | Paiements, factures |
| **readonly** | Lecture seule | Uniquement view_* |

---

### Row Level Security (RLS)

**Fonctions helper :**
```sql
- auth.user_id() → UUID de l'utilisateur connecté
- get_user_role() → UUID du rôle
- has_permission(code) → boolean
- is_admin() → boolean
```

**Exemple de policy :**
```sql
CREATE POLICY "Users can view client files"
  ON client_files FOR SELECT
  USING (has_permission('view_client_files'));
```

**Protection :**
- Toutes les tables ont RLS activé
- Policices vérifiées côté serveur
- Double vérification côté UI pour UX

---

## Composants clés

### 1. Pipeline CRM (Kanban)

**Composant :** `features/crm/components/pipeline-board.tsx`

**Colonnes :**
- Nouveau lead
- Inscription en cours
- Bulletin prêt
- Validation en attente
- Validé
- Paiement en attente
- Payé
- Terminé

**Fonctionnalités :**
- Drag & drop pour changer statut
- Filtres : événement, assignation, dates
- Compteurs par colonne
- Click sur carte → modal fiche complète

---

### 2. Fiche Dossier Client

**Composant :** `features/client-files/components/client-file-detail.tsx`

**Sections :**
1. **En-tête** : référence, statuts, badges
2. **Contact principal** : nom, tél, email
3. **Participants** : liste avec type/âge
4. **Commercial** : chambre, prix, montants
5. **Paiement** : liens, statuts, historique
6. **Facturation** : statut, future intégration
7. **Timeline** : activity log
8. **Notes internes** : commentaires équipe

---

### 3. Dashboard Global

**Composant :** `features/dashboard/components/global-dashboard.tsx`

**Widgets :**
- Stats globales (leads, dossiers, CA)
- Répartition par événement (chart)
- Répartition par statut CRM (chart)
- Répartition par type de chambre
- Dernières activités
- Dossiers récents
- Actions rapides

---

### 4. Fiche Événement

**Composant :** `features/events/components/event-detail.tsx`

**Sections :**
1. **Infos générales** : nom, dates, hôtel
2. **Stats** : nombre dossiers, CA, statuts
3. **Types de chambres** : liste + prix
4. **Inventaire commercial** : compteurs par type
5. **Dossiers liés** : table filtrable
6. **Actions** : éditer, dupliquer, archiver

---

## User Flows détaillés

### Flow 1 : Création événement complet

```
┌─────────────────────────────────────────────────┐
│ 1. Admin clique "Créer événement"              │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 2. Formulaire événement                         │
│    - Nom, type, dates                           │
│    - Hôtel, destination                         │
│    - Dates d'ouverture/fermeture ventes        │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 3. Save → status = draft                        │
│    → Redirection fiche événement                │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 4. Onglet "Chambres & Prix"                     │
│    - Ajouter type chambre (Junior)              │
│    - Capacités, description                     │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 5. Définir prix pour ce type                    │
│    - Prix : 2500€                               │
│    - Acompte : 800€                             │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 6. Répéter pour autres chambres                 │
│    (Premium, Family, Ocean Front)               │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 7. Activer événement                            │
│    → status = active                            │
│    → Visible dans dashboard                     │
└─────────────────────────────────────────────────┘
```

---

### Flow 2 : Lead WhatsApp → Dossier complet → Paiement

```
┌─────────────────────────────────────────────────┐
│ ÉTAPE 1 : RÉCEPTION LEAD                        │
└─────────────────────────────────────────────────┘
Client WhatsApp : "Bonjour, je veux réserver 
Maurice décembre, 2 adultes + 1 enfant 8 ans"

Commercial copie le message
                    ↓
┌─────────────────────────────────────────────────┐
│ Commercial → Menu "Leads" → "Nouveau"           │
│ Formulaire :                                    │
│  - Source : WhatsApp                            │
│  - Événement : Maurice Décembre 2026            │
│  - Nom : Dupont                                 │
│  - Téléphone : +33 6 12 34 56 78                │
│  - Message brut : [copié-collé]                 │
│  - Statut : new                                 │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ ÉTAPE 2 : QUALIFICATION                         │
└─────────────────────────────────────────────────┘
Commercial ouvre fiche lead
                    ↓
Ajoute note interne : "Client connu, bon profil"
                    ↓
Change statut : new → qualified
                    ↓
┌─────────────────────────────────────────────────┐
│ ÉTAPE 3 : CONVERSION EN DOSSIER                 │
└─────────────────────────────────────────────────┘
Commercial clique "Convertir en dossier"
                    ↓
┌─────────────────────────────────────────────────┐
│ Formulaire dossier pré-rempli :                 │
│  - Événement : Maurice Décembre 2026            │
│  - Contact : Dupont, téléphone                  │
│  - Référence auto : MAU-2026-0042               │
│  - CRM status : inscription_in_progress         │
└─────────────────────────────────────────────────┘
                    ↓
Commercial complète :
 - Prénom : Jean
 - Email : jean.dupont@email.com
                    ↓
┌─────────────────────────────────────────────────┐
│ ÉTAPE 4 : AJOUT PARTICIPANTS                    │
└─────────────────────────────────────────────────┘
Section Participants :
 - Ajoute Jean Dupont (adulte)
 - Ajoute Marie Dupont (adulte)
 - Ajoute Lucas Dupont (enfant, 8 ans)
                    ↓
Compteurs auto-calculés :
 - total_participants = 3
 - adults_count = 2
 - children_count = 1
                    ↓
┌─────────────────────────────────────────────────┐
│ ÉTAPE 5 : SÉLECTION CHAMBRE & PRIX              │
└─────────────────────────────────────────────────┘
Commercial sélectionne :
 - Type chambre : Family Suite
 - Prix affiché auto : 4500€
 - Acompte suggéré : 1500€
                    ↓
Save dossier
                    ↓
┌─────────────────────────────────────────────────┐
│ ÉTAPE 6 : PRÉPARATION BULLETIN                  │
└─────────────────────────────────────────────────┘
Commercial change statut :
 → bulletin_ready
                    ↓
Ajoute note : "Bulletin envoyé par WhatsApp"
                    ↓
┌─────────────────────────────────────────────────┐
│ ÉTAPE 7 : VALIDATION INTERNE                    │
└─────────────────────────────────────────────────┘
Manager ouvre dossier
                    ↓
Vérifie infos, prix, participants
                    ↓
Change statut :
 → validated
                    ↓
┌─────────────────────────────────────────────────┐
│ ÉTAPE 8 : PRÉPARATION PAIEMENT                  │
└─────────────────────────────────────────────────┘
Commercial → Onglet "Paiements"
                    ↓
Clique "Nouveau lien de paiement"
                    ↓
┌─────────────────────────────────────────────────┐
│ Formulaire PaymentLink :                        │
│  - Montant : 1500€ (acompte)                    │
│  - Provider : bred_manual                       │
│  - URL : [colle lien BRED]                      │
│  - Status : draft                               │
└─────────────────────────────────────────────────┘
Save → status = sent
                    ↓
Payment status dossier → pending
                    ↓
Commercial envoie lien via WhatsApp manuellement
                    ↓
┌─────────────────────────────────────────────────┐
│ ÉTAPE 9 : CONFIRMATION PAIEMENT                 │
└─────────────────────────────────────────────────┘
Client paie via BRED
                    ↓
Commercial reçoit notification BRED (email)
                    ↓
Commercial ouvre dossier → Onglet Paiements
                    ↓
Clique sur PaymentLink
                    ↓
Change status : sent → paid
                    ↓
Saisit date paiement
                    ↓
Save
                    ↓
┌─────────────────────────────────────────────────┐
│ Auto-update dossier :                           │
│  - amount_paid = 1500€                          │
│  - balance_due = 3000€                          │
│  - payment_status = partially_paid              │
└─────────────────────────────────────────────────┘
                    ↓
Activity log enregistre :
 "Paiement de 1500€ confirmé par [User]"
                    ↓
┌─────────────────────────────────────────────────┐
│ ÉTAPE 10 : FACTURATION (future)                 │
└─────────────────────────────────────────────────┘
invoice_status = pending
(intégration Pennylane en V2)
```

---

## Design System

### Palette de couleurs

**Couleurs principales (turquoise/lagon) :**
```css
--turquoise-50:  #f0fdfc   /* Très clair, backgrounds */
--turquoise-100: #ccfbf7   /* Clair, hover states */
--turquoise-200: #99f6e8
--turquoise-300: #5eead4
--turquoise-400: #2dd4bf   /* Principal */
--turquoise-500: #14b8a6   /* Active states */
--turquoise-600: #0d9488   /* Liens, CTA */
--turquoise-700: #0f766e
--turquoise-800: #115e59
--turquoise-900: #134e4a   /* Texte sur clair */
```

**Couleurs neutres :**
```css
--gray-50:  #fafafa         /* Background principal */
--gray-100: #f5f5f5         /* Background secondaire */
--gray-200: #e5e5e5         /* Bordures légères */
--gray-300: #d4d4d4
--gray-400: #a3a3a3
--gray-500: #737373
--gray-600: #525252
--gray-700: #404040
--gray-800: #262626         /* Texte */
--gray-900: #171717         /* Titres */
```

**Couleurs sémantiques :**
```css
--success:  #22c55e         /* Vert */
--warning:  #f59e0b         /* Orange */
--error:    #ef4444         /* Rouge */
--info:     #3b82f6         /* Bleu */
```

---

### Badges de statuts

**CRM Status :**
- `new_lead` : gris-500
- `qualification_in_progress` : bleu-500
- `inscription_in_progress` : turquoise-600
- `bulletin_ready` : violet-500
- `waiting_internal_validation` : orange-500
- `validated` : vert-400
- `completed` : vert-600
- `cancelled` : rouge-500

**Payment Status :**
- `not_sent` : gris-400
- `pending` : orange-500
- `partially_paid` : jaune-500
- `paid` : vert-600
- `failed` : rouge-600
- `refunded` : violet-500

**Invoice Status :**
- `not_created` : gris-400
- `pending` : bleu-500
- `created` : violet-500
- `sent` : orange-500
- `paid` : vert-600

---

### Typography

```css
Font Family: 
  - System: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif

Tailles :
  - Display (h1):  2.5rem / 40px, font-bold
  - Title (h2):    2rem / 32px, font-semibold
  - Heading (h3):  1.5rem / 24px, font-semibold
  - Subheading:    1.25rem / 20px, font-medium
  - Body:          1rem / 16px, font-normal
  - Small:         0.875rem / 14px, font-normal
  - Tiny:          0.75rem / 12px, font-normal
```

---

### Spacing

```
xs:  0.25rem / 4px
sm:  0.5rem  / 8px
md:  1rem    / 16px
lg:  1.5rem  / 24px
xl:  2rem    / 32px
2xl: 3rem    / 48px
3xl: 4rem    / 64px
```

---

### Components UI

**Basés sur Shadcn/ui personnalisés :**
- Button (variants: default, outline, ghost, link)
- Card
- Dialog / Modal
- Badge
- Table
- Form (Input, Select, Textarea, Checkbox, Radio)
- Tabs
- Dropdown Menu
- Toast / Notification
- Loading Spinner
- Empty State
- Skeleton Loader

---

## Conventions de code

### Nommage

**Fichiers :**
- Components : `PascalCase.tsx` (ex: `ClientFileCard.tsx`)
- Utilities : `kebab-case.ts` (ex: `format-currency.ts`)
- Types : `PascalCase.ts` (ex: `ClientFile.ts`)

**Variables/Functions :**
- camelCase pour variables/functions
- PascalCase pour types/interfaces/classes
- SCREAMING_SNAKE_CASE pour constantes

**Composants :**
```typescript
// ✅ Bon
export function ClientFileCard({ file }: Props) { }

// ❌ Mauvais
export default function component() { }
```

---

### Structure d'un feature module

```
features/client-files/
├── components/
│   ├── ClientFileCard.tsx
│   ├── ClientFileForm.tsx
│   ├── ClientFileTable.tsx
│   ├── ParticipantList.tsx
│   └── index.ts
├── hooks/
│   ├── useClientFiles.ts
│   ├── useClientFileMutations.ts
│   └── index.ts
├── services/
│   └── client-file.service.ts
├── types.ts
└── constants.ts
```

---

### TypeScript best practices

```typescript
// ✅ Typage strict
interface ClientFile {
  id: string;
  file_reference: string;
  crm_status: CRMStatus;
  // ...
}

// ✅ Zod schema pour validation
const clientFileSchema = z.object({
  file_reference: z.string().min(1),
  crm_status: z.enum([...]),
  // ...
});

// ✅ Type inference
const files = await getClientFiles(); // Type inferred

// ❌ Éviter any
const data: any = await fetchData(); // BAD
```

---

### React best practices

```typescript
// ✅ Server Component par défaut (App Router)
export default async function ClientFilesPage() {
  const files = await getClientFiles();
  return <ClientFileTable files={files} />;
}

// ✅ Client Component uniquement si interactivité
'use client';
export function ClientFileForm() {
  const [isOpen, setIsOpen] = useState(false);
  // ...
}

// ✅ Server Actions pour mutations
'use server';
export async function createClientFile(data: FormData) {
  // ...
}
```

---

## Stratégie d'extension

### Points d'extension V2

**1. WhatsApp Business API**
```
features/integrations/whatsapp/
├── services/
│   └── whatsapp-api.service.ts
├── webhooks/
│   └── message-received.ts
└── templates/
    └── message-templates.ts
```

**2. BRED Payment API**
```
features/integrations/bred/
├── services/
│   ├── bred-api.service.ts
│   └── payment-link-generator.ts
└── webhooks/
    └── payment-callback.ts
```

**3. Pennylane Invoicing**
```
features/integrations/pennylane/
├── services/
│   ├── pennylane-api.service.ts
│   └── invoice-sync.service.ts
└── types.ts
```

---

### Architecture événementielle

**Préparer des event hooks :**
```typescript
// lib/events/event-emitter.ts
type EventType = 
  | 'client_file.created'
  | 'client_file.status_changed'
  | 'payment.received'
  | 'invoice.created';

// Permettra V2+ :
emitter.on('payment.received', async (payload) => {
  // Send WhatsApp notification
  // Update invoice status
  // Log activity
});
```

---

### Modules futurs (V3)

**Préparer les tables mais ne pas implémenter UI :**
- `room_assignments` : numéros réels de chambres
- `excursions` : activités proposées
- `mini_club_bookings` : réservations mini-club
- `on_site_stock` : gestion stock sur place
- `client_portal_access` : espace client

---

## Conclusion

Cette architecture est conçue pour :
✅ Répondre précisément aux besoins métier V1
✅ Être maintenable et évolutive
✅ Permettre une V2 sans refonte
✅ Maintenir une séparation propre des responsabilités
✅ Garantir la sécurité via RLS + permissions
✅ Offrir une UX premium et fluide

**Prochaine étape :** validation de cette conception, puis génération du code complet.
