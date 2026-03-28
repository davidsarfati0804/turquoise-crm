# 🎯 Mise à jour Format BI Turquoise Club Officiel

**Date:** 23 mars 2026  
**Version:** 3.0 - Format Bulletin Officiel  
**Migration:** `005_bi_turquoise_format_enhancements.sql`

---

## 📋 Résumé des changements

### Objectif
Adapter le système CRM pour générer des Bulletins d'Inscription qui correspondent **exactement** au format officiel utilisé par Club Turquoise, basé sur le modèle de contrat de vente fourni.

---

## 🆕 Nouveaux champs ajoutés

### 1. **Table `events` - Dates et hébergement**

#### Dates de voyage :
- `arrival_date` (DATE) - Date d'arrivée
- `departure_date` (DATE) - Date de retour  
- `nights_count` (INTEGER) - Nombre de nuitées (auto-calculé)
- `check_in_time` (TIME) - Heure de check-in (défaut: 15h00)
- `check_out_time` (TIME) - Heure de check-out (défaut: 12h00)

#### Pension :
- `pension_type` (VARCHAR) - Type de pension (pension_complete, demi_pension, all_inclusive...)
- `pension_details` (TEXT) - Détails (ex: "hors boissons")
- `room_count` (INTEGER) - Nombre de chambres
- `nounou_included` (BOOLEAN) - Nounou privée incluse
- `nounou_details` (TEXT) - Détails du service nounou

### 2. **Table `client_files` - Assurance et paiement**

#### Assurance :
- `insurance_included` (BOOLEAN) - Assurance incluse dans le forfait
- `insurance_accepted` (VARCHAR) - Type d'assurance acceptée par le client
- `insurance_refused` (VARCHAR) - Type d'assurance refusée par le client

#### Politique d'annulation :
- `cancellation_policy` (JSONB) - Conditions avec pourcentages:
  ```json
  {
    "more_than_2_months": "10%",
    "between_1_and_2_months": "30%",
    "between_15_days_and_1_month": "60%",
    "less_than_15_days": "100%"
  }
  ```

#### Conditions de paiement :
- `deposit_percentage` (DECIMAL) - % d'acompte (défaut: 50%)
- `deposit_due_date` (DATE) - Date limite acompte
- `balance_due_date` (DATE) - Date limite solde
- `payment_methods` (JSONB) - Modes acceptés: `["cheque", "cb"]`

#### Détails bancaires :
- `payment_bank_name` (VARCHAR) - Nom de la banque
- `payment_check_number` (VARCHAR) - Numéro de chèque
- `payment_cb_number` (VARCHAR) - Numéro CB
- `payment_cb_expiry` (VARCHAR) - Date expiration CB
- `payment_cb_cvv` (VARCHAR) - CVV (sécurisé)

#### Services et observations :
- `included_services` (TEXT[]) - Services inclus
- `observations` (TEXT) - Observations spéciales
- `early_checkin_requested` (BOOLEAN) - Early check-in demandé
- `late_checkout_requested` (BOOLEAN) - Late check-out demandé
- `special_requests` (TEXT) - Demandes spéciales

### 3. **Table `bulletin_inscriptions` - Suivi signature**

- `client_signature_status` (VARCHAR) - Statut signature (pending, signed, refused)
- `client_signed_at` (TIMESTAMP) - Date de signature
- `signature_method` (VARCHAR) - Méthode (manuscrite, electronique)

### 4. **Nouvelle table `company_settings`**

Table pour stocker les informations de l'agence :

#### Identité :
- `company_name` - "Club Turquoise"
- `legal_name` - Raison sociale

#### Branding :
- `logo_url` - URL du logo
- `primary_color` - Couleur principale (#0891b2)

#### Contact :
- `address_line1` - "24 rue Octave Feuillet"
- `address_line2` - Complément d'adresse
- `postal_code` - "75016"
- `city` - "Paris"
- `country` - "France"
- `phone` - "01 53 43 02 24"
- `mobile` - "06 50 51 51 51"
- `email` - "contact@club-turquoise.fr"
- `website` - "www.club-turquoise.fr"

#### Légal :
- `siret` - "882 208 374 00018"
- `ape_code` - "5710"
- `tva_intracommunautaire` - "FR19882208374"

---

## 📝 Template BI mis à jour

### Nouveau format HTML

Le template email génère maintenant un document qui correspond **exactement** au format papier Turquoise Club :

#### Structure :
1. **Header** - Logo "Turquoise CLUB"
2. **Title** - "Bulletin d'inscription - Contrat de vente" (aligné à droite)
3. **Dates & Références** - Date d'émission, N° dossier
4. **Voyageurs** - Liste avec nom/prénom/date de naissance
5. **Client** - Coordonnées complètes
6. **Dates de voyage** - Arrivée/Retour/Nuitées (fond turquoise)
7. **Hébergement** - Hôtel, chambres, check-in/out, pension (fond turquoise)
8. **Assurance** - Incluse/acceptée/refusée (fond turquoise)
9. **Conditions d'annulation** - 4 paliers avec pourcentages
10. **Conditions de règlement** - 50% + Solde avec checkboxes
11. **Décompte** - Détail services et total TTC
12. **Observations** - Notes spéciales
13. **Signature** - Section "Lu et approuvé"
14. **Footer** - Coordonnées complètes de l'agence

#### Style :
- Police : Arial, Helvetica (standard contrat)
- Taille : 11pt (corps), 10pt (détails)
- Bordure : 2px noir
- Fond turquoise : `#e0f2f7` pour sections importantes
- Checkboxes : `□` pour paiement

---

## 🔧 Fonctions utilitaires ajoutées

### `calculate_nights(arrival_date, departure_date)`
Calcule automatiquement le nombre de nuitées entre deux dates.

### `generate_bi_number(file_reference)`
Génère le numéro BI au format `BI-{reference}`.

---

## 🎨 Améliorations UI

### EventForm (Formulaire d'événement)

**Nouvelle section "Dates de voyage"** :
- Date d'arrivée
- Date de retour
- Calcul automatique des nuitées

**Nouvelle section "Hébergement"** :
- Heure check-in (défaut: 15:00)
- Heure check-out (défaut: 12:00)
- Type de pension (select)
- Détails pension (input)
- Checkbox "Nounou privée incluse"
- Détails nounou (input)

### BIGenerator (Générateur BI)

**Données enrichies** :
- Inclusion des nouvelles dates
- Informations pension
- Services inclus
- Assurance
- Observations

---

## 📦 Fichiers modifiés

### Migrations SQL :
1. **`005_bi_turquoise_format_enhancements.sql`** (NOUVEAU - 350 lignes)
   - Ajout de tous les nouveaux champs
   - Création table `company_settings`
   - Fonctions utilitaires
   - Valeurs par défaut Turquoise Club

### Code frontend :
2. **`app/(dashboard)/dashboard/evenements/nouveau/EventForm.tsx`**
   - Ajout sections dates et hébergement
   - Calcul automatique nuitées
   - Nouveaux champs dans submission

3. **`app/(dashboard)/dashboard/dossiers/[id]/BIGenerator.tsx`**
   - Snapshot enrichi avec nouveaux champs
   - Support assurance et observations

### Services :
4. **`lib/services/email.service.ts`**
   - Template HTML complètement refait
   - Format exact Turquoise Club
   - Sections avec fond turquoise
   - Footer avec coordonnées légales

---

## 🚀 Instructions de déploiement

### Étape 1 : Exécuter la nouvelle migration

```bash
# Dans Supabase Dashboard > SQL Editor
# Copier/coller le contenu de :
supabase/migrations/005_bi_turquoise_format_enhancements.sql
```

**Cette migration est SAFE** :
- Utilise `ADD COLUMN IF NOT EXISTS` (pas d'erreur si déjà existant)
- Définit des valeurs par défaut
- N'efface aucune donnée existante
- Peut être exécutée plusieurs fois sans problème

### Étape 2 : Vérifier les données

```sql
-- Vérifier la table company_settings
SELECT * FROM company_settings;

-- Vérifier les nouveaux champs events
SELECT id, name, arrival_date, departure_date, nights_count, pension_type 
FROM events 
LIMIT 5;

-- Vérifier les nouveaux champs client_files
SELECT id, file_reference, insurance_included, deposit_percentage 
FROM client_files 
LIMIT 5;
```

### Étape 3 : Tester le système

1. **Créer un nouvel événement** avec les nouvelles dates
2. **Créer un dossier client** 
3. **Générer le BI** → Vérifier le nouveau format
4. **Envoyer par email** → Vérifier le template HTML

---

## 📊 Comparaison avant/après

### Avant (Version 2.0) :
- ❌ Pas de dates de voyage
- ❌ Pas d'informations pension
- ❌ Pas d'assurance
- ❌ Pas de conditions d'annulation
- ❌ Template email basique
- ❌ Pas de coordonnées légales

### Après (Version 3.0) :
- ✅ Dates arrivée/retour + nuitées
- ✅ Check-in/out + pension détaillée
- ✅ Assurance incluse/acceptée/refusée
- ✅ Politique d'annulation 4 paliers
- ✅ Conditions de paiement (50% + solde)
- ✅ Template HTML format officiel Turquoise
- ✅ Footer avec SIRET, APE, TVA

---

## 🎯 Format du BI généré

### Exemple de BI :

```
┌────────────────────────────────────────────────────┐
│ Turquoise                                          │
│ CLUB                                               │
│                                                    │
│            Bulletin d'inscription - Contrat de vente│
├────────────────────────────────────────────────────┤
│ Date d'émission: 16/01/2026                        │
│ Dossier ferme N°: 5567934                          │
├────────────────────────────────────────────────────┤
│ Voyageurs (nom/prénom/date de naissance)           │
│   SEBBAH NATHAN                                    │
│   SEBBAH ADELAIDE                                  │
│   AZOULAY ELLA 19/05/2021                         │
│   SEBBAH LIV 14/06/2025                           │
├────────────────────────────────────────────────────┤
│ Client                                             │
│ SEBBAH NATHAN                                      │
│ FRANCE                                             │
│ Tél: +33 6 35 44 86 51                            │
├────────────────────────────────────────────────────┤
│ ░░ Date d'arrivée: 19/02/2026                     │
│ ░░ Date de retour: 01/03/2026                     │
│ ░░ Nombre de nuitées: 10 NUITS                    │
├────────────────────────────────────────────────────┤
│ ░░ Hébergement: LONG BEACH 5* FEVRIER 2026        │
│ ░░ Nombre de chambre: 1                           │
│ ░░ Check in 15h00 - Check out 12h00               │
│ ░░ Type de chambre: Junior Suite                  │
│ ░░ Pension complète hors boissons                 │
├────────────────────────────────────────────────────┤
│ ░░ Assurance: Non incluse dans le forfait         │
│ ░░ Acceptée: Annulation, complémentaire, multirisque│
│ ░░ Refusée: Annulation, complémentaire, multirisque│
├────────────────────────────────────────────────────┤
│ Conditions d'annulation:                           │
│  • Plus de 2 mois avant: 10% de la prestation    │
│  • Entre 1 et 2 mois: 30% de la prestation       │
│  • Entre 15 jours et 1 mois: 60%                 │
│  • Moins de 15 jours: 100%                        │
├────────────────────────────────────────────────────┤
│ Conditions de règlements:                          │
│  50% à réservation  □ Chèque N°: ...              │
│  Solde 1 mois avant □ C.B. N°: ...                │
├────────────────────────────────────────────────────┤
│ Décompte de la prestation                         │
│ 10 nuits en pension complète Hors Boissons        │
│ Transferts aéroport/hôtel/aéroport                │
│                                                    │
│ Total: 9735 euros taxes comprises                  │
├────────────────────────────────────────────────────┤
│ Lu et approuvé (mention manuscrite)                │
│ Le: _______________  Signature du client          │
├────────────────────────────────────────────────────┤
│ Club Turquoise                                     │
│ 24 rue Octave Feuillet - 75016 Paris              │
│ Tel: 01 53 43 02 24 - Mobile: 06 50 51 51 51     │
│ Siret: 882 208 374 00018 - APE: 5710              │
│ TVA: FR19882208374                                 │
│ www.club-turquoise.fr                              │
└────────────────────────────────────────────────────┘
```

---

## ✅ Checklist de validation

### Après migration :
- [ ] Migration 005 exécutée sans erreur
- [ ] Table `company_settings` créée avec données Turquoise
- [ ] Nouveaux champs présents dans `events`
- [ ] Nouveaux champs présents dans `client_files`
- [ ] Nouveaux champs présents dans `bulletin_inscriptions`

### Après test événement :
- [ ] Formulaire événement affiche sections dates/hébergement
- [ ] Calcul automatique des nuitées fonctionne
- [ ] Pension et nounou peuvent être configurés

### Après génération BI :
- [ ] BI contient les dates de voyage
- [ ] BI contient les infos hébergement
- [ ] BI contient les conditions d'annulation
- [ ] BI contient le footer avec coordonnées légales
- [ ] Format correspond au document Turquoise officiel

### Après envoi email :
- [ ] Template HTML reçu avec bon format
- [ ] Fond turquoise sur bonnes sections
- [ ] Footer complet avec SIRET/APE/TVA
- [ ] Section signature présente

---

## 🔄 Rétrocompatibilité

### Données existantes :
✅ **Toutes les données existantes sont préservées**

Les nouveaux champs ont des valeurs par défaut :
- `check_in_time` → 15:00
- `check_out_time` → 12:00
- `pension_type` → 'pension_complete'
- `pension_details` → 'Pension complète hors boissons'
- `insurance_included` → false
- `deposit_percentage` → 50.00

### BIs déjà générés :
✅ **Les BIs existants** continuent de fonctionner

Le template vérifie l'existence des champs et affiche "—" si non disponible.

---

## 🆙 Prochaines évolutions possibles

### Phase 4 (future) :
1. **Page de configuration agence**
   - Interface pour modifier `company_settings`
   - Upload logo
   - Personnalisation couleurs

2. **Signature électronique**
   - Intégration DocuSign ou similaire
   - Suivi status signature
   - Archivage légal

3. **Génération PDF**
   - Conversion HTML → PDF côté serveur
   - Watermark si non signé
   - Envoi automatique après signature

4. **Multi-langues**
   - BI en anglais/français
   - Template adaptatif selon client

---

## 📚 Documentation associée

- **API_INTEGRATION_GUIDE.md** - Guide APIs WhatsApp/Email
- **NEXT_STEPS.md** - Étapes suivantes
- **INFRASTRUCTURE_READY.md** - État de l'infrastructure
- **QUICK_START.md** - Guide démarrage rapide

---

**Résultat final** : Le système génère maintenant des Bulletins d'Inscription conformes au format officiel Turquoise Club, prêts pour impression ou envoi légal aux clients. ✨

---

**Auteur:** GitHub Copilot  
**Version:** 3.0  
**Date:** 23 mars 2026
