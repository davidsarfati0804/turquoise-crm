# 🚀 QUICK START — Système BI & Pricing

## 📦 Fichiers créés

```
supabase/migrations/
└── 004_travel_agency_schema.sql    ← Migration complète (11 tables)

app/(dashboard)/dashboard/
├── evenements/nouveau/
│   └── EventForm.tsx               ← ✨ MODIFIÉ: ajout section pricing
└── dossiers/[id]/
    ├── BIGenerator.tsx             ← ✨ NOUVEAU: générateur de BI
    └── page.tsx                    ← ✨ MODIFIÉ: intégration BIGenerator

docs/
├── MIGRATION_BI_README.md          ← Guide d'utilisation complet
├── SUPABASE_SETUP.md               ← Guide de déploiement
└── SUMMARY.md                      ← Résumé technique
```

## ⚡ Installation rapide (3 étapes)

### 1. Exécuter la migration SQL

```bash
# Ouvrir: https://supabase.com/dashboard
# SQL Editor → New query
# Copier/coller: supabase/migrations/004_travel_agency_schema.sql
# Cliquer: Run
```

### 2. Vérifier les types de chambres

```sql
SELECT * FROM room_types;
-- Doit retourner 4 lignes: Junior Suite, Premium Suite, Family, Ocean Front
```

### 3. Relancer le serveur

```bash
npm run dev
# Serveur sur http://localhost:3000 (ou 3001)
```

## 🎯 Fonctionnalités

### ✅ Prix des chambres lors création événement

**Où:** `/dashboard/evenements/nouveau`

**Avant:**
- Nom, type, destination, hôtel uniquement
- Prix à définir après dans l'onglet "Chambres"

**Maintenant:**
- ✨ Section "💶 Prix des chambres" intégrée
- 4 types de chambres affichés automatiquement
- Prix par personne + acompte demandés
- Sauvegarde directe dans `event_room_pricing`

**Code:**
```tsx
// EventForm charge les room_types au mount
useEffect(() => {
  loadRoomTypes() // Récupère les 4 types
}, [])

// Champs de saisie pour chaque chambre
{roomTypes.map(roomType => (
  <div key={roomType.id}>
    <input type="number" placeholder="Prix par personne" />
    <input type="number" placeholder="Acompte" />
  </div>
))}
```

### ✅ Génération de BI complète

**Où:** `/dashboard/dossiers/[id]` (section Bulletin d'Inscription)

**Étapes:**
1. Cliquer "📄 Générer le Bulletin d'Inscription"
2. Le système récupère: client, événement, participants, chambre, prix
3. Crée un BI avec numéro unique (BI-MAU-26-XXXX)
4. Sauvegarde snapshot JSON dans `bulletin_inscriptions`
5. Affiche prévisualisation complète

**Données incluses:**
```
👤 Informations Client (nom, tél, email)
🏝️ Détails du Voyage (événement, destination, hôtel)
👥 Participants (adultes, enfants, bébés + liste)
💰 Tarification (chambre, prix/pers, acompte, total, solde)
```

### ✅ Envoi WhatsApp fonctionnel

**Bouton:** "Envoyer via WhatsApp"

**Fonctionnement:**
1. Formate le BI en message texte avec emojis
2. Construit l'URL: `https://wa.me/{phone}?text={message}`
3. Ouvre WhatsApp Web/App dans nouvel onglet
4. Message pré-rempli, client juste clique "Envoyer"
5. Enregistre `sent_via_whatsapp = true` dans DB

**Format du message:**
```
🏝️ *BULLETIN D'INSCRIPTION*

*Référence:* MAU-26-0042
*Client:* John Doe

*Événement:* Maurice Décembre 2026
*Destination:* Île Maurice
*Hôtel:* Paradise Resort & Spa

*Participants:* 2 personnes
- Adultes: 2
- Enfants: 0

*Type de chambre:* Junior Suite
*Prix par personne:* 2500EUR
*Acompte:* 800EUR

*TOTAL:* 5000EUR
*Solde:* 3400EUR

Merci de votre confiance! 🙏
```

### ✅ Email placeholder

**Bouton:** "Envoyer via Email (Bientôt)"

Affiche: "⚠️ Fonctionnalité Email en développement."

### ✅ Impression/PDF

**Bouton:** "Imprimer / PDF"

Utilise `window.print()` pour:
- Imprimer directement
- Sauvegarder en PDF via "Imprimer → PDF"

## 📊 Structure de données

### Tables créées

```sql
events                    ← Événements/Offres (Séjours, Mariages)
room_types                ← 4 types de chambres standards
event_room_pricing        ← Prix par événement × chambre
leads                     ← Demandes client
client_files              ← Dossiers clients (pipeline CRM)
participants              ← Participants par dossier
payment_links             ← Liens de paiement
invoices                  ← Factures
activity_logs             ← Historique d'activité
internal_notes            ← Notes internes
bulletin_inscriptions     ← BI générés et envoyés ✨
```

### Relations principales

```
events 1→N event_room_pricing
room_types 1→N event_room_pricing
events 1→N leads
leads 1→1 client_files (conversion)
client_files 1→N participants
client_files 1→N bulletin_inscriptions ✨
```

## 🔧 API endpoints (futur)

### Générer un BI

```typescript
POST /api/bulletin-inscriptions
Body: { client_file_id: string }
Response: { bi_number, data, pdf_url? }
```

### Envoyer via WhatsApp

```typescript
POST /api/bulletin-inscriptions/:id/send-whatsapp
Response: { sent: true, sent_at: timestamp }
```

### Envoyer via Email (à implémenter)

```typescript
POST /api/bulletin-inscriptions/:id/send-email
Body: { to: string, subject?: string }
Response: { sent: true, sent_at: timestamp }
```

## 🎨 Personnalisation

### Modifier le template du BI

Fichier: `app/(dashboard)/dashboard/dossiers/[id]/BIGenerator.tsx`

```tsx
// Ligne ~200: Modifier la prévisualisation
<div className="bg-white border-2 border-turquoise-500 rounded-lg shadow-xl p-8">
  {/* Personnaliser ici */}
</div>
```

### Modifier le message WhatsApp

Fichier: `app/(dashboard)/dashboard/dossiers/[id]/BIGenerator.tsx`

```tsx
// Ligne ~125: Modifier le message
const message = encodeURIComponent(
  `🏝️ *BULLETIN D'INSCRIPTION*\n\n` +
  // Ajouter/modifier les sections ici
)
```

### Ajouter des types de chambres

```sql
INSERT INTO room_types (code, name, description, base_capacity, max_capacity, display_order)
VALUES ('DELUXE', 'Deluxe Suite', 'Suite luxe avec spa privé', 2, 2, 5);
```

## 📈 Évolutions possibles

- [ ] Export PDF natif (via jsPDF, Puppeteer, ou API externe)
- [ ] Envoi Email via Resend/SendGrid
- [ ] Signature électronique du client
- [ ] Multi-langue (FR/EN/AR)
- [ ] Thèmes personnalisables par événement
- [ ] QR code pour tracking
- [ ] Notifications push
- [ ] Historique des versions du BI
- [ ] Templates personnalisables par événement

## 🐛 Debug

### BI ne se génère pas

```tsx
// Ouvrir la console (F12)
// Vérifier les erreurs fetch/supabase
// Vérifier que toutes les données sont présentes:
console.log({
  clientFile,
  event,
  roomType,
  pricing
})
```

### Prix non affichés dans la création

```tsx
// Vérifier que room_types sont chargés:
console.log('Room types:', roomTypes)

// Si vide, exécuter la migration SQL
```

### WhatsApp ne s'ouvre pas

```tsx
// Vérifier le format du numéro:
console.log('Phone:', phone)
// Doit être: +33612345678 (avec +)

// Tester manuellement:
window.open('https://wa.me/33612345678?text=Test')
```

## 🎓 Ressources

- **Supabase**: https://supabase.com/docs
- **Next.js 15**: https://nextjs.org/docs
- **WhatsApp API**: https://wa.me/
- **TailwindCSS**: https://tailwindcss.com/docs

---

**Version:** 2.0  
**Date:** 23 Mars 2026  
**Statut:** ✅ Production Ready
