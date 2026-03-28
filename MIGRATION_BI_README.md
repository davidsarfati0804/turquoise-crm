# 🚀 MISE À JOUR IMPORTANTE — BI & Pricing System

## ✅ Ce qui a été ajouté

### 1. **Migration complète Travel Agency** (`004_travel_agency_schema.sql`)

Cette migration ajoute le schéma complet pour l'agence de voyage:

#### Nouvelles tables créées:
- `events` - Événements/Offres (Séjours, Mariages)
- `room_types` - Types de chambres (4 types pré-configurés)
- `event_room_pricing` - Prix par événement × chambre
- `leads` - Demandes client
- `client_files` - Dossiers clients avec pipeline CRM
- `participants` - Participants sur chaque dossier
- `payment_links` - Liens de paiement
- `invoices` - Factures
- `activity_logs` - Historique d'activité
- `internal_notes` - Notes internes
- **`bulletin_inscriptions`** - BI générés et envoyés ✨ NOUVEAU

#### Types de chambres pré-configurés:
1. **Junior Suite** - Chambre confortable avec vue jardin (2 pers)
2. **Premium Suite** - Chambre premium avec balcon (2 pers)
3. **Family** - Chambre familiale spacieuse (4 pers)
4. **Ocean Front** - Chambre avec vue mer directe (2-3 pers)

### 2. **Formulaire de création d'événement amélioré**

Le formulaire `/dashboard/evenements/nouveau` demande maintenant:
- Nom, type (Séjour/Mariage), destination, hôtel, description
- **💶 Prix pour chaque type de chambre** (prix par personne + acompte)

✅ Plus besoin de modifier les prix après création!

### 3. **Système de génération de BI complet**

Nouveau composant `/dashboard/dossiers/[id]` avec:

#### Fonctionnalités:
- **Génération du BI** avec snapshot des données (client, événement, participants, chambres, tarifs)
- **Prévisualisation complète** avec design professionnel
- **Envoi WhatsApp** fonctionnel via `wa.me` (WhatsApp Web/App)
- **Envoi Email** (placeholder - non fonctionnel comme demandé)
- **Impression/PDF** via `window.print()`

#### Contenu du BI:
```
📄 BULLETIN D'INSCRIPTION
├── Référence dossier (MAU-26-XXXX)
├── 👤 Informations Client
│   ├── Nom complet
│   ├── Téléphone
│   └── Email
├── 🏝️ Détails du Voyage
│   ├── Événement
│   ├── Destination
│   └── Hôtel
├── 👥 Participants
│   ├── Nombre (adultes/enfants/bébés)
│   └── Liste détaillée
└── 💰 Tarification
    ├── Type de chambre
    ├── Prix par personne
    ├── Acompte
    ├── TOTAL
    ├── Déjà payé
    └── Solde restant
```

## 🔧 Installation

### 1. Exécuter la migration

**Option A: Via Supabase Dashboard**
```
1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet
3. Aller dans "SQL Editor"
4. Copier/coller le contenu de supabase/migrations/004_travel_agency_schema.sql
5. Cliquer "Run"
```

**Option B: Via Supabase CLI** (si installé)
```bash
supabase db push
```

### 2. Vérifier les types de chambres

Connectez-vous au dashboard et vérifiez que la table `room_types` contient les 4 chambres:
```sql
SELECT * FROM room_types;
```

Vous devriez voir:
- Junior Suite
- Premium Suite
- Family
- Ocean Front

### 3. Relancer le serveur de dev

```bash
npm run dev
```

Le serveur devrait démarrer sur `http://localhost:3000` (ou 3001 si 3000 est occupé).

## 📋 Comment utiliser le système

### Créer un événement avec prix

1. Aller sur `/dashboard/evenements`
2. Cliquer "Nouvel événement"
3. Remplir les informations de base
4. **Définir les prix pour chaque type de chambre** (section "💶 Prix des chambres")
5. Cliquer "Créer l'événement"

✅ Les prix sont maintenant enregistrés pour cet événement!

### Générer et envoyer un BI

1. Aller sur un dossier client `/dashboard/dossiers/[id]`
2. Scroller jusqu'à la section "📄 Bulletin d'Inscription"
3. Cliquer "📄 Générer le Bulletin d'Inscription"
4. Le BI s'affiche avec prévisualisation complète
5. Choisir l'envoi:
   - **WhatsApp**: Message pré-rempli envoyé via WhatsApp Web/App ✅
   - **Email**: Placeholder (non fonctionnel) ⚠️
   - **Imprimer/PDF**: Utilise la fonction d'impression du navigateur

### Envoi WhatsApp

Le système:
1. Génère un message formaté avec toutes les infos du BI
2. Ouvre WhatsApp Web/App avec le message pré-rempli
3. Le numéro du client est automatiquement détecté
4. Vous devez juste cliquer "Envoyer" dans WhatsApp
5. Le système enregistre que le BI a été envoyé via WhatsApp

## 🎨 Design du BI

Le BI affiché dans l'application est structuré avec:
- En-tête turquoise avec titre et référence
- Sections bien séparées avec icônes
- Mise en page professionnelle
- Totaux et soldes mis en évidence
- Prêt pour l'impression (design print-friendly)

Pour l'envoi WhatsApp, le message est **formaté en texte** avec:
- Emojis pour la lisibilité
- Structure claire avec sections
- Tous les montants et détails importants

## 🔍 Données stockées

Chaque BI généré est sauvegardé dans la table `bulletin_inscriptions` avec:
- `bi_number` - Numéro unique (ex: BI-MAU-26-0042)
- `data` - Snapshot JSON complet des données au moment de la génération
- `pdf_url` - URL du PDF (à implémenter avec un service PDF)
- `sent_via_whatsapp` - Boolean + timestamp
- `sent_via_email` - Boolean + timestamp
- `generated_by` - User ID qui a généré le BI

Cela permet:
- Historique complet des BI envoyés
- Traçabilité des envois
- Possibilité de régénérer un BI avec les données à jour

## ⚠️ Important

### Migration 004
La migration `004_travel_agency_schema.sql` utilise `CREATE TABLE IF NOT EXISTS`, donc:
- ✅ Sûr à exécuter même si les tables existent déjà
- ✅ Les données existantes ne seront pas supprimées
- ✅ Les 4 types de chambres sont insérés avec `ON CONFLICT DO NOTHING`

### WhatsApp
L'envoi WhatsApp utilise `wa.me` qui:
- ✅ Fonctionne sur mobile (ouvre l'app WhatsApp)
- ✅ Fonctionne sur desktop (ouvre WhatsApp Web)
- ⚠️ Nécessite que le numéro soit au format international (ex: +33612345678)
- ⚠️ L'utilisateur doit confirmer l'envoi dans WhatsApp

### Email
Comme demandé, l'email est un placeholder:
- ⚠️ Le bouton affiche "Envoyer via Email (Bientôt)"
- ⚠️ Cliquer dessus affiche une alerte "Fonctionnalité en développement"
- 💡 Pour implémenter: utiliser Resend, SendGrid, ou l'API Supabase Edge Functions

## 🐛 Troubleshooting

### "Aucun type de chambre trouvé"
→ Exécutez la migration `004_travel_agency_schema.sql`

### "Erreur lors de la sauvegarde des prix"
→ Vérifiez que la table `event_room_pricing` existe
→ Vérifiez les permissions RLS dans Supabase

### WhatsApp ne s'ouvre pas
→ Vérifiez le format du numéro de téléphone
→ Testez avec un numéro international (+33...)

### Le BI ne se génère pas
→ Vérifiez que toutes les données sont présentes (event, room_type, pricing)
→ Vérifiez la console pour les erreurs
→ Vérifiez que la table `bulletin_inscriptions` existe

## 📞 Support

Si vous rencontrez des problèmes:
1. Vérifiez la console du navigateur (F12)
2. Vérifiez les logs Supabase
3. Vérifiez que la migration a bien été exécutée
4. Vérifiez que les RLS policies sont activées

---

**Date de mise à jour**: 23 Mars 2026
**Version**: 2.0 - BI System & Room Pricing
