# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run lint         # ESLint check
npm run type-check   # TypeScript strict check (no tsc --noEmit shortcuts)
npm run format       # Prettier auto-format
npm run format:check # Check formatting without writing
```

There are no automated tests in this project.

## Architecture

**Turquoise CRM** is a travel agency CRM built with Next.js 15 (App Router), Supabase (PostgreSQL + Auth + RLS), and TypeScript strict mode.

### Core Business Flow

```
Lead (WhatsApp/manual) → Dossier (client file) → Participants + Rooms → Bulletin d'Inscription → Payment → Invoice
```

### Route Groups

- `app/(auth)/` — Public login (unauthenticated)
- `app/(dashboard)/dashboard/` — All protected pages (40+ modules)
- `app/api/` — API routes: auth callback, BI generation, WhatsApp webhooks

### Key Modules

| Module | Path | Purpose |
|--------|------|---------|
| Événements | `dashboard/evenements/` | Travel event management |
| Leads | `dashboard/leads/` | Lead capture & qualification |
| Dossiers | `dashboard/dossiers/` | Core CRM — client files (full lifecycle) |
| CRM | `dashboard/crm/` | Kanban pipeline view |
| WhatsApp | `dashboard/whatsapp/` | WhatsApp inbox |
| Paiements | `dashboard/paiements/` | Payment link tracking |

### Data Layer

All data access goes through Supabase. Use the right client:
- `lib/supabase/client.ts` — browser (Client Components)
- `lib/supabase/server.ts` — server (Server Components, Server Actions, API routes)
- `lib/supabase/middleware.ts` — session management

**Core tables:** `events`, `leads`, `client_files`, `participants`, `room_types`, `event_room_pricing`, `bulletin_inscriptions`, `payment_links`, `invoices`, `activity_logs`, `internal_notes`

**Legacy B2B tables** (`clients`, `contacts`, `opportunites`, `devis`, `factures`) exist from the initial schema but travel-specific flows use the newer tables above.

Row Level Security is enforced on all tables. 4 roles: `admin`, `manager`, `agent`, `viewer`.

### Services (`lib/services/`)

Business logic is separated into service files:
- `email.service.ts` — Email (currently mock; Resend/SendGrid planned)
- `whatsapp.service.ts` — WhatsApp (wa.me links + Cloud API)
- `google-docs.service.ts` — Google Docs API for BI generation
- `yousign.service.ts` — Electronic signatures
- `whatsapp-ai.service.ts` — AI-powered WhatsApp responses

### Patterns

- **Server Components by default** — use Client Components only when needed (interactivity, hooks)
- **Server Actions for mutations** — type-safe, no separate API routes needed for most writes
- **Zod schemas** in `lib/validations/` for form validation with React Hook Form
- **Shadcn/ui** components in `components/ui/` — extend these, don't replace them
- **`@/*`** path alias maps to project root

### Database Migrations

Migrations live in `supabase/migrations/`. Key files:
- `001_initial_schema.sql` — Legacy B2B schema
- `004_travel_agency_schema.sql` — Travel-specific tables (events, leads, dossiers)
- `003_rls_policies.sql` — Row Level Security policies

### Environment Variables

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server-only
NEXT_PUBLIC_APP_URL=

# Google Docs (BI generation)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GOOGLE_DOCS_BI_TEMPLATE_ID=

# WhatsApp Business Cloud API
WHATSAPP_API_KEY=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=

# Optional
ANTHROPIC_API_KEY=
YOUSIGN_API_KEY=
YOUSIGN_SANDBOX=true
```
