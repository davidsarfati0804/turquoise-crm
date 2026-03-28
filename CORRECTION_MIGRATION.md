# 🔧 Correction Migration 005

## ⚠️ Situation actuelle

La migration 005 a été **partiellement appliquée** :

### ✅ Déjà fait (SECTION 2)
- Table `company_settings` créée avec données Turquoise Club
- Nouvelles colonnes dans `events` : arrival_date, departure_date, check_in_time, pension_type
- Nouvelles colonnes dans `client_files` : insurance_included, cancellation_policy, deposit_percentage
- Nouvelles colonnes dans `bulletin_inscriptions` : signature tracking

### ❌ Manquant (SECTION 1)
- Colonnes `description` et `hotel_name` existent encore dans `events` (à supprimer)
- Colonne `price_per_person` n'a pas été renommée en `price_per_room` dans `event_room_pricing`
- Colonne `deposit_amount` existe encore dans `event_room_pricing` (à supprimer)

---

## 🚀 Solution rapide (2 minutes)

### **Étape 1 : Ouvrir SQL Editor Supabase**

Ouvrez directement : https://supabase.com/dashboard/project/efeipwdpftgdeaemmkha/sql

### **Étape 2 : Copier le script de correction**

Copiez TOUT le contenu du fichier : `supabase/migrations/005_correction.sql`

### **Étape 3 : Coller et exécuter**

1. Collez dans l'éditeur SQL
2. Cliquez sur **"Run"** (bouton vert en bas à droite)
3. Vérifiez les messages dans l'onglet "Messages" :
   - Vous devriez voir : `✅ events.description supprimée`
   - Vous devriez voir : `✅ event_room_pricing.price_per_room existe`

### **Étape 4 : Vérifier**

Retournez dans le terminal et exécutez :

```bash
npx ts-node scripts/verify-migration.ts
```

Vous devriez voir : `✅ Migration 005 correctement appliquée!`

---

## 📝 Détails techniques

Le script de correction contient :

1. `DROP COLUMN IF EXISTS description, hotel_name` sur `events`
2. `RENAME COLUMN price_per_person TO price_per_room` sur `event_room_pricing`
3. `DROP COLUMN IF EXISTS deposit_amount` sur `event_room_pricing`
4. Vérifications automatiques avec messages de confirmation

**Sécurité :** Toutes les opérations utilisent `IF EXISTS` donc le script peut être exécuté plusieurs fois sans problème.

---

## ✅ Après correction

Une fois la correction appliquée :

1. **Mettez à jour les fichiers TypeScript** (déjà fait ✅)
   - EventForm.tsx utilise maintenant `price_per_room`
   - Types mis à jour (suppression de description/hotel_name)

2. **Testez le système**
   ```bash
   npm run dev
   ```

3. **Créez un événement test**
   - Allez sur http://localhost:3001/dashboard/evenements/nouveau
   - Les champs hotel_name et description ne sont plus présents
   - La tarification affiche "Prix par chambre" avec un seul champ

---

## 🆘 Besoin d'aide ?

Si vous voyez des erreurs, copiez-les et donnez-les moi. Le script de vérification `verify-migration.ts` donne des diagnostics précis.
