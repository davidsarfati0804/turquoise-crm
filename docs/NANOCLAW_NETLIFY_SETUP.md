sur # Guide de paramétrage complet — Nanoclaw + Netlify

Ce guide couvre l'intégration WhatsApp du CRM Turquoise via Nanoclaw (passerelle Baileys/WhatsApp Web) et le déploiement sur Netlify.

---

## Architecture de l'intégration

```
┌─────────────┐        ┌──────────────┐        ┌─────────────────────┐
│  WhatsApp   │◄──────►│   Nanoclaw   │◄──────►│   Supabase (DB)     │
│  (Baileys)  │        │  (passerelle)│        │  whatsapp_send_queue│
└─────────────┘        └──────┬───────┘        └─────────────────────┘
                              │ webhook POST
                              ▼
                    ┌──────────────────────┐
                    │  Netlify (CRM Next)  │
                    │  /api/whatsapp/      │
                    │    inbound           │
                    └──────────────────────┘
```

**Flux messages entrants (inbound) :**
WhatsApp → Nanoclaw → POST `/api/whatsapp/inbound` → Supabase `whatsapp_messages`

**Flux messages sortants (outbound) :**
CRM → Supabase `whatsapp_send_queue` (status=pending) → Nanoclaw (polling) → WhatsApp

---

## 1. Variables d'environnement — Netlify

### Où les configurer
`Netlify Dashboard → [ton site] → Site configuration → Environment variables → Add a variable`

### Variables obligatoires

| Variable | Description | Exemple |
|----------|-------------|---------|
| `NEXT_cu` | URL de ton projet Supabase | `https://abcxyz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anon publique Supabase | `eyJhbGci...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service_role (secrète) — jamais exposée côté client | `eyJhbGci...` |
| `NEXT_PUBLIC_APP_URL` | URL publique du site Netlify | `https://turquoise-crm.netlify.app` |
| `NANOCLAW_INBOUND_SECRET` | Token secret partagé avec Nanoclaw pour authentifier les webhooks entrants | `un-token-secret-fort-ici` |

> **CRITIQUE** : Si `NANOCLAW_INBOUND_SECRET` est absent ou différent de celui configuré dans Nanoclaw, **tous les messages entrants seront rejetés (HTTP 401)** et n'apparaîtront jamais dans le CRM.

### Variables pour le provider d'envoi

| Variable | Valeur | Description |
|----------|--------|-------------|
| `WHATSAPP_SEND_PROVIDER` | `nanoclaw-ipc` | Force l'envoi via Nanoclaw. Mettre cette valeur si tu n'utilises PAS Meta Cloud API. |

### Variables optionnelles (Meta Cloud API — non utilisé si tu uses Nanoclaw)

| Variable | Description |
|----------|-------------|
| `WHATSAPP_API_TOKEN` | Token Meta Cloud API (laisser vide si Nanoclaw) |
| `WHATSAPP_PHONE_NUMBER_ID` | ID du numéro Meta (laisser vide si Nanoclaw) |

### Variables pour les autres services

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Clé API Anthropic — pour les suggestions IA dans l'inbox WhatsApp |
| `GOOGLE_CLIENT_ID` | Pour génération Bulletins d'Inscription Google Docs |
| `GOOGLE_CLIENT_SECRET` | Pour génération BI Google Docs |
| `GOOGLE_REFRESH_TOKEN` | Pour génération BI Google Docs |
| `GOOGLE_DOCS_BI_TEMPLATE_ID` | ID du template Google Doc pour les BI |

---

## 2. Configuration Nanoclaw

### 2.1 Paramètres webhook (messages entrants)

Dans l'interface de configuration Nanoclaw, configurer :

```
Webhook URL   : https://[ton-site].netlify.app/api/whatsapp/inbound
Webhook Method: POST
Auth Header   : Authorization: Bearer <valeur de NANOCLAW_INBOUND_SECRET>
Content-Type  : application/json
```

> Le token Bearer doit être **exactement identique** à la valeur de `NANOCLAW_INBOUND_SECRET` dans Netlify.

### 2.2 Format du payload attendu par le CRM

Nanoclaw doit envoyer un JSON avec cette structure :

```json
{
  "id": "ABCDEF123456",
  "chat_jid": "33612345678@s.whatsapp.net",
  "sender": "33612345678@s.whatsapp.net",
  "sender_name": "Prénom Nom",
  "content": "Contenu du message texte",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "is_from_me": false
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | ID unique du message WhatsApp (utilisé pour éviter les doublons) |
| `chat_jid` | string | JID de la conversation. Format `33612345678@s.whatsapp.net` ou `123456789@lid` pour les LID |
| `sender` | string | JID de l'expéditeur |
| `sender_name` | string | Nom affiché WhatsApp de l'expéditeur |
| `content` | string | Contenu textuel du message |
| `timestamp` | string | Horodatage ISO 8601 (ex: `"2024-01-15T10:30:00.000Z"`) |
| `is_from_me` | boolean | `true` si le message a été envoyé depuis ton téléphone |

> **Important sur le timestamp** : envoyer impérativement une chaîne ISO 8601, pas un timestamp Unix numérique.

### 2.3 Paramètres Supabase (messages sortants — polling)

Nanoclaw doit accéder à Supabase pour lire la file d'envoi :

```
Supabase URL         : https://[ton-projet].supabase.co
Supabase Service Key : <SUPABASE_SERVICE_ROLE_KEY>
Table à surveiller   : whatsapp_send_queue
Filtre               : status = 'pending'
Tri                  : created_at ASC
```

**Ce que Nanoclaw doit faire après envoi :**
- Si envoi réussi → mettre `status = 'sent'` et `processed_at = now()`
- Si erreur → mettre `status = 'failed'` et `error_message = <erreur>`

### 2.4 Structure de la table `whatsapp_send_queue`

```sql
id            uuid        -- ID de la tâche
chat_jid      text        -- JID cible (ex: 33612345678@s.whatsapp.net ou 123@lid)
message_type  text        -- 'text' | 'image' | 'video' | 'document' | 'audio'
message_text  text        -- Contenu texte (si message_type = 'text')
media_url     text        -- URL publique du média (si media)
media_caption text        -- Légende du média (optionnel)
status        text        -- 'pending' | 'processing' | 'sent' | 'failed'
error_message text        -- Erreur si failed
created_at    timestamptz -- Date de création
processed_at  timestamptz -- Date de traitement
```

---

## 3. Migrations Supabase à appliquer

Ces SQL doivent être exécutées dans **Supabase Dashboard → SQL Editor** si ce n'est pas encore fait :

### Migration 020 — Nanny 2
```sql
ALTER TABLE client_files ADD COLUMN IF NOT EXISTS nanny_name_2 VARCHAR(255);
```

### Migration 021 — Audio WhatsApp
```sql
ALTER TABLE whatsapp_messages DROP CONSTRAINT IF EXISTS valid_message_type;
ALTER TABLE whatsapp_messages ADD CONSTRAINT valid_message_type
  CHECK (message_type IN ('text', 'image', 'document', 'location', 'media', 'video', 'audio'));
```

---

## 4. Vérification de l'intégration

### Test 1 — Webhook inbound (message entrant)

Depuis un terminal ou Postman, envoyer une requête simulée :

```bash
curl -X POST https://[ton-site].netlify.app/api/whatsapp/inbound \
  -H "Authorization: Bearer <NANOCLAW_INBOUND_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-msg-001",
    "chat_jid": "33600000000@s.whatsapp.net",
    "sender": "33600000000@s.whatsapp.net",
    "sender_name": "Test Client",
    "content": "Message de test",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "is_from_me": false
  }'
```

**Réponse attendue :** `{"ok": true}`

Si tu obtiens `{"error": "Unauthorized"}` → le secret ne correspond pas.

### Test 2 — Message sortant

1. Ouvre le CRM → WhatsApp → sélectionne une conversation
2. Tape un message et envoie
3. Dans Supabase → Table Editor → `whatsapp_send_queue` : une ligne avec `status='pending'` doit apparaître
4. Après que Nanoclaw l'ait traitée, `status` passe à `'sent'`

### Test 3 — Realtime (mise à jour en direct)

1. Ouvre l'inbox WhatsApp dans le CRM
2. Depuis un autre appareil, envoie un vrai message WhatsApp
3. Le message doit apparaître dans le CRM sans rafraîchir la page (Supabase Realtime)

Si le Realtime ne fonctionne pas, vérifier que la table `whatsapp_messages` est bien publiée :

```sql
-- À exécuter dans Supabase SQL Editor si le realtime ne fonctionne pas
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_send_queue;
```

---

## 5. Checklist de mise en production

```
NETLIFY
[ ] NEXT_PUBLIC_SUPABASE_URL          configuré
[ ] NEXT_PUBLIC_SUPABASE_ANON_KEY     configuré
[ ] SUPABASE_SERVICE_ROLE_KEY         configuré
[ ] NEXT_PUBLIC_APP_URL               = URL Netlify exacte (sans slash final)
[ ] NANOCLAW_INBOUND_SECRET           = token fort (min 32 caractères)
[ ] WHATSAPP_SEND_PROVIDER            = nanoclaw-ipc
[ ] ANTHROPIC_API_KEY                 configuré (pour l'IA)

NANOCLAW
[ ] Webhook URL                       = https://[site].netlify.app/api/whatsapp/inbound
[ ] Webhook Bearer token              = identique à NANOCLAW_INBOUND_SECRET
[ ] Supabase URL                      configurée
[ ] Supabase Service Key              configurée
[ ] Polling whatsapp_send_queue       actif (filtre: status='pending')
[ ] Mise à jour status après envoi    implémentée (sent / failed)

SUPABASE
[ ] Migration 020 exécutée            (nanny_name_2)
[ ] Migration 021 exécutée            (audio message type)
[ ] Realtime activé sur              whatsapp_messages + whatsapp_send_queue
[ ] RLS policies en place            (vérifier migration 011)
```

---

## 6. Dépannage

| Symptôme | Cause probable | Solution |
|----------|----------------|----------|
| Messages entrants invisibles dans le CRM | `NANOCLAW_INBOUND_SECRET` absent ou incorrect | Vérifier la variable dans Netlify et dans Nanoclaw |
| Messages sortants restent à `status=pending` | Nanoclaw ne poll pas la queue | Vérifier la config Supabase dans Nanoclaw |
| Inbox ne se met pas à jour en temps réel | Realtime non activé sur la table | Exécuter `ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages` |
| Erreur 401 sur `/api/whatsapp/inbound` | Secret manquant ou mauvais | Vérifier les 2 côtés (Netlify + Nanoclaw) |
| Erreur DB sur envoi audio/vocal | Contrainte `valid_message_type` | Exécuter migration 021 dans Supabase |
| Badge statut lead toujours vide dans inbox | Bug `crm_status` (corrigé en v5feb13c) | Redéployer si l'ancien code est en prod |
| Suggestions IA ne fonctionnent pas | `ANTHROPIC_API_KEY` absent | Ajouter la clé dans Netlify |
