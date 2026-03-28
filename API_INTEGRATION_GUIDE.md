# 🔌 GUIDE D'INTÉGRATION DES API

## Infrastructure créée

L'infrastructure pour WhatsApp et Email est **déjà en place** et prête à recevoir les connexions API.

### ✅ Ce qui est prêt

```
lib/services/
├── whatsapp.service.ts    ← Service WhatsApp (wa.me → Cloud API)
├── email.service.ts       ← Service Email (mock → Resend/SendGrid)

app/api/bulletin-inscriptions/[id]/
├── send-whatsapp/route.ts ← API route WhatsApp
└── send-email/route.ts    ← API route Email
```

---

## 📱 Option 1: WhatsApp Business Cloud API (Recommandé)

### Avantages
- ✅ API officielle Meta
- ✅ Gratuit jusqu'à 1000 conversations/mois
- ✅ Messages programmables
- ✅ Statuts de livraison
- ✅ Templates approuvés

### Configuration

1. **Créer une app Meta**
   - Aller sur https://developers.facebook.com
   - Créer une nouvelle app → Business
   - Ajouter le produit "WhatsApp"

2. **Obtenir les credentials**
   ```
   WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
   WHATSAPP_TOKEN=your_permanent_token
   WHATSAPP_BUSINESS_ACCOUNT_ID=your_waba_id
   ```

3. **Modifier `lib/services/whatsapp.service.ts`**

```typescript
// Décommenter et compléter:
const response = await fetch(
  `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: { body: message }
    })
  }
)

const data = await response.json()
return {
  success: true,
  messageId: data.messages[0].id
}
```

4. **Ajouter au `.env.local`**
```env
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_TOKEN=EAAxxxxxxxxxx
```

### Documentation
- https://developers.facebook.com/docs/whatsapp/cloud-api
- https://developers.facebook.com/docs/whatsapp/cloud-api/messages

---

## 📱 Option 2: Twilio WhatsApp

### Avantages
- ✅ Setup rapide
- ✅ Support excellent
- ✅ Logs détaillés
- ⚠️ Payant (0.005$/message)

### Configuration

1. **Créer un compte Twilio**
   - https://www.twilio.com/try-twilio
   - Console → Messaging → Try it out → Send WhatsApp

2. **Obtenir les credentials**
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_WHATSAPP_NUMBER=+14155238886
   ```

3. **Modifier `lib/services/whatsapp.service.ts`**

```typescript
// Décommenter et compléter:
const response = await fetch(
  `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(
        `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
      ).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      From: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      To: `whatsapp:+${phone}`,
      Body: message
    })
  }
)

const data = await response.json()
return {
  success: true,
  messageId: data.sid
}
```

4. **Ajouter au `.env.local`**
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_WHATSAPP_NUMBER=+14155238886
```

### Documentation
- https://www.twilio.com/docs/whatsapp/quickstart/node

---

## 📧 Option 1: Resend (Recommandé)

### Avantages
- ✅ API moderne et simple
- ✅ 3000 emails/mois gratuits
- ✅ Templates React/HTML
- ✅ Analytics inclus
- ✅ Excellent pour Next.js

### Configuration

1. **Créer un compte Resend**
   - https://resend.com
   - API Keys → Create API Key

2. **Installer le SDK**
```bash
npm install resend
```

3. **Modifier `lib/services/email.service.ts`**

```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendBIEmail(data: EmailBIData): Promise<EmailResult> {
  try {
    const response = await resend.emails.send({
      from: 'Turquoise CRM <noreply@your-domain.com>',
      to: data.to,
      subject: `Bulletin d'Inscription - ${data.fileReference}`,
      html: generateBIEmailHTML(data),
      text: generateBIEmailText(data)
    })

    return {
      success: true,
      messageId: response.id
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}
```

4. **Ajouter au `.env.local`**
```env
RESEND_API_KEY=re_xxxxxxxxxx
```

5. **Configurer le domaine (optionnel)**
   - Dans Resend Dashboard → Domains
   - Ajouter votre domaine
   - Configurer les DNS (SPF, DKIM, DMARC)

### Documentation
- https://resend.com/docs/send-with-nextjs
- https://resend.com/docs/api-reference/emails/send-email

---

## 📧 Option 2: SendGrid

### Avantages
- ✅ 100 emails/jour gratuits
- ✅ Très établi et fiable
- ✅ Dashboard complet

### Configuration

1. **Créer un compte SendGrid**
   - https://signup.sendgrid.com
   - Settings → API Keys → Create API Key

2. **Installer le SDK**
```bash
npm install @sendgrid/mail
```

3. **Modifier `lib/services/email.service.ts`**

```typescript
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export async function sendBIEmail(data: EmailBIData): Promise<EmailResult> {
  try {
    const msg = {
      to: data.to,
      from: 'noreply@your-domain.com',
      subject: `Bulletin d'Inscription - ${data.fileReference}`,
      html: generateBIEmailHTML(data),
      text: generateBIEmailText(data)
    }

    const response = await sgMail.send(msg)

    return {
      success: true,
      messageId: response[0].headers['x-message-id']
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}
```

4. **Ajouter au `.env.local`**
```env
SENDGRID_API_KEY=SG.xxxxxxxxxx
```

### Documentation
- https://docs.sendgrid.com/for-developers/sending-email/quickstart-nodejs

---

## 📧 Option 3: Supabase Edge Functions + Resend

### Avantages
- ✅ Gratuit (inclus dans Supabase)
- ✅ Serverless
- ✅ Logs intégrés

### Configuration

1. **Créer une Edge Function**
```bash
supabase functions new send-bi-email
```

2. **Code de la fonction** (`supabase/functions/send-bi-email/index.ts`)
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { to, biData } = await req.json()

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'noreply@your-domain.com',
      to,
      subject: `BI - ${biData.fileReference}`,
      html: generateHTML(biData)
    })
  })

  return new Response(
    JSON.stringify(await response.json()),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

3. **Déployer**
```bash
supabase functions deploy send-bi-email --no-verify-jwt
```

4. **Appeler depuis le client**
```typescript
const { data, error } = await supabase.functions.invoke('send-bi-email', {
  body: { to: email, biData }
})
```

### Documentation
- https://supabase.com/docs/guides/functions

---

## 🧪 Tests

### Tester WhatsApp en local

```typescript
// Dans la console du navigateur ou Node.js
const result = await sendBIWhatsApp({
  phone: '+33612345678',
  clientName: 'Test Client',
  eventName: 'Test Event',
  biNumber: 'BI-TEST-001',
  fileReference: 'MAU-26-TEST',
  biData: { /* ... */ }
})

console.log(result)
```

### Tester Email en local

```typescript
const result = await sendBIEmail({
  to: 'test@example.com',
  clientName: 'Test Client',
  eventName: 'Test Event',
  biNumber: 'BI-TEST-001',
  fileReference: 'MAU-26-TEST',
  biData: { /* ... */ }
})

console.log(result)
```

### Tester via API routes

```bash
# WhatsApp
curl -X POST http://localhost:3001/api/bulletin-inscriptions/[ID]/send-whatsapp \
  -H "Cookie: sb-access-token=..." \
  -H "Content-Type: application/json"

# Email
curl -X POST http://localhost:3001/api/bulletin-inscriptions/[ID]/send-email \
  -H "Cookie: sb-access-token=..." \
  -H "Content-Type: application/json"
```

---

## 🔐 Sécurité

### Variables d'environnement

**Production:**
```env
# Dans Vercel/Netlify/ailleurs
WHATSAPP_TOKEN=xxx
RESEND_API_KEY=xxx
# NE JAMAIS commiter ces clés!
```

**Développement:**
```env
# .env.local (gitignored)
WHATSAPP_TOKEN=test_xxx
RESEND_API_KEY=test_xxx
```

### Permissions

Les API routes vérifient automatiquement:
- ✅ Authentification Supabase
- ✅ Ownership du BI (via client_file_id)

---

## 📊 Monitoring

### Logs Supabase

```typescript
// Ajouter des logs dans les services
console.log('[WhatsApp] Sending to:', phone)
console.log('[Email] Sending to:', to)
```

### Tableau de bord

Créer une page `/dashboard/envois` pour tracker:
- Nombre de BI envoyés
- Taux de succès WhatsApp/Email
- Erreurs courantes

---

## 🚀 Déploiement

1. Ajouter les variables d'environnement
2. Vérifier les services
3. Tester en staging
4. Déployer en production
5. Monitorer les premiers envois

---

**Besoin d'aide?**
- WhatsApp Cloud API: https://developers.facebook.com/community/whatsapp
- Resend: https://resend.com/docs
- Twilio: https://support.twilio.com
