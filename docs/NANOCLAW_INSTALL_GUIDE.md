# Guide d'installation Nanoclaw — Étape par étape

Nanoclaw n'est **pas** un service en ligne avec une clé API. C'est un programme Node.js
que tu installes et fais tourner en permanence sur un ordinateur ou serveur.
Il se connecte à WhatsApp (via ton téléphone), reçoit les messages, et les envoie
au CRM via le webhook.

---

## Prérequis (à installer en premier)

| Outil | Version min | Lien |
|-------|-------------|------|
| Node.js | 20+ | https://nodejs.org |
| Git | toute version | déjà installé sur Mac |
| Claude Code CLI | dernière | `npm install -g @anthropic/claude-code` |
| Docker Desktop | toute version | https://docker.com/products/docker-desktop (Mac) |

Vérifier que tout est installé :
```bash
node --version      # doit afficher v20 ou +
git --version
claude --version
docker --version
```

---

## Étape 1 — Cloner et lancer le setup

```bash
git clone https://github.com/qwibitai/nanoclaw.git
cd nanoclaw
claude
```

La commande `claude` lance le setup interactif de Nanoclaw.
**Suis les instructions à l'écran** — Claude Code va :
1. Installer les dépendances Node
2. Configurer l'authentification (compte Anthropic)
3. Te demander de connecter WhatsApp (QR code à scanner avec ton téléphone)
4. Créer le fichier de configuration

---

## Étape 2 — Ce qu'il faut configurer pendant le setup

Quand le setup te demande de configurer les canaux et intégrations,
voici exactement quoi renseigner :

### Connexion WhatsApp
- Scanner le QR code qui s'affiche avec l'app WhatsApp sur ton téléphone
  (Paramètres → Appareils connectés → Connecter un appareil)
- Une fois scanné, Nanoclaw reste connecté à ce numéro

### Webhook CRM (messages entrants → CRM)
Quand le setup demande où envoyer les messages reçus :

```
Webhook URL    : https://[ton-site].netlify.app/api/whatsapp/inbound
Bearer token   : [valeur de NANOCLAW_INBOUND_SECRET dans Netlify]
```

> C'est ce token qui doit être identique des 2 côtés.
> Choisis une chaîne aléatoire longue, ex: `turquoise-nanoclaw-2024-xK9mP3vQ`
> et mets cette même valeur dans Netlify ET ici.

### Supabase (messages sortants — polling de la queue)
Nanoclaw doit lire la table `whatsapp_send_queue` pour envoyer les messages tapés dans le CRM :

```
Supabase URL         : https://[ton-projet].supabase.co
Supabase Service Key : [SUPABASE_SERVICE_ROLE_KEY]
Table               : whatsapp_send_queue
```

### Clé Anthropic (pour les agents IA de Nanoclaw)
```
ANTHROPIC_API_KEY : [ta clé Anthropic]
```

---

## Étape 3 — Lancer Nanoclaw

Une fois le setup terminé :

```bash
# Lancer en mode développement (pour tester)
npm run dev

# Ou lancer en production
npm run build && npm start
```

Tu devrais voir dans les logs que Nanoclaw est connecté à WhatsApp
et qu'il surveille la table `whatsapp_send_queue`.

---

## Étape 4 — Garder Nanoclaw actif en permanence

Nanoclaw doit tourner **24h/24** pour que le CRM fonctionne.
Deux options selon où tu le fais tourner :

### Option A — Sur ton Mac (simple mais le Mac doit rester allumé)

Installer PM2 (gestionnaire de processus) :
```bash
npm install -g pm2
pm2 start npm --name nanoclaw -- start
pm2 save
pm2 startup   # pour redémarrer automatiquement au boot
```

Vérifier que ça tourne :
```bash
pm2 status
pm2 logs nanoclaw
```

### Option B — Sur un VPS/serveur Linux (recommandé pour la production)

Prendre un petit serveur (ex: DigitalOcean Droplet à 6$/mois, Ubuntu 22.04) :

```bash
# Sur le serveur
git clone https://github.com/qwibitai/nanoclaw.git
cd nanoclaw
node --version   # vérifier Node 20+

# Lancer le setup
claude

# Garder actif avec PM2
npm install -g pm2
pm2 start npm --name nanoclaw -- start
pm2 save && pm2 startup
```

> Le VPS n'a pas besoin d'IP publique fixe — Nanoclaw est lui qui sort vers
> l'extérieur (vers Netlify et Supabase), pas l'inverse.

---

## Étape 5 — Vérifier que tout fonctionne

### Test 1 — Message entrant (quelqu'un t'écrit sur WhatsApp)
1. Envoie un message WhatsApp au numéro connecté à Nanoclaw
2. Va dans le CRM → WhatsApp inbox
3. Le message doit apparaître dans les secondes qui suivent

Si rien n'apparaît :
- Vérifie les logs Nanoclaw : `pm2 logs nanoclaw`
- Vérifie que le webhook URL et le token sont corrects
- Teste manuellement avec `curl` (voir section Dépannage)

### Test 2 — Message sortant (CRM → WhatsApp)
1. Dans le CRM → WhatsApp inbox → sélectionne une conversation
2. Tape un message et envoie
3. Dans Supabase → Table Editor → `whatsapp_send_queue` : une ligne apparaît avec `status='pending'`
4. En quelques secondes, Nanoclaw la lit et envoie → `status` passe à `'sent'`
5. Le destinataire reçoit le message sur son WhatsApp

---

## Récapitulatif des tokens/secrets à synchroniser

```
NANOCLAW_INBOUND_SECRET  =  [même valeur dans Netlify ET dans Nanoclaw]
SUPABASE_SERVICE_ROLE_KEY =  [même valeur dans Netlify ET dans Nanoclaw]
NEXT_PUBLIC_SUPABASE_URL  =  [même valeur dans Netlify ET dans Nanoclaw]
```

---

## Dépannage

### "Unauthorized" sur le webhook inbound
```bash
# Test manuel — remplace les valeurs par les tiennes
curl -X POST https://[ton-site].netlify.app/api/whatsapp/inbound \
  -H "Authorization: Bearer [NANOCLAW_INBOUND_SECRET]" \
  -H "Content-Type: application/json" \
  -d '{"id":"test","chat_jid":"33600000000@s.whatsapp.net","sender":"33600000000@s.whatsapp.net","sender_name":"Test","content":"Test","timestamp":"2024-01-15T10:30:00.000Z","is_from_me":false}'
```
→ `{"ok":true}` = fonctionne
→ `{"error":"Unauthorized"}` = `NANOCLAW_INBOUND_SECRET` absent ou différent dans Netlify

### Nanoclaw se déconnecte de WhatsApp
WhatsApp peut déconnecter les sessions après inactivité. Si Nanoclaw se déconnecte :
- Relancer `npm run dev` ou `pm2 restart nanoclaw`
- Scanner à nouveau le QR code

### Messages sortants restent `pending` dans Supabase
- Vérifier que Nanoclaw tourne : `pm2 status`
- Vérifier les logs : `pm2 logs nanoclaw`
- Vérifier que la Supabase Service Key dans Nanoclaw est correcte
