# 🚀 Guide d'exécution des migrations Supabase

## ✅ Connexion testée avec succès !

Votre fichier `.env.local` est correctement configuré et la connexion à Supabase fonctionne.

---

## 📋 3 Options pour exécuter la migration 005

### **Option 1 : Via Dashboard Supabase** (⭐ RECOMMANDÉ - 30 secondes)

1. Ouvrez https://supabase.com/dashboard/project/efeipwdpftgdeaemmkha/sql
2. Copiez TOUT le contenu du fichier `supabase/migrations/005_bi_turquoise_format_enhancements.sql`
3. Collez dans l'éditeur SQL
4. Cliquez sur **"Run"** (bouton vert en bas à droite)
5. Vérifiez qu'il affiche "Success. No rows returned" (c'est normal !)

**Avantages :**
- ✅ Le plus rapide
- ✅ Interface graphique avec coloration syntaxique
- ✅ Messages d'erreur clairs
- ✅ Historique des requêtes sauvegardé

---

### **Option 2 : Via Supabase CLI** (Terminal)

Si vous préférez utiliser le terminal :

```bash
# 1. Installer Supabase CLI (une seule fois)
npm install -g supabase

# 2. Se connecter à votre projet
supabase link --project-ref efeipwdpftgdeaemmkha

# 3. Exécuter la migration
supabase db execute -f supabase/migrations/005_bi_turquoise_format_enhancements.sql
```

**Avantages :**
- ✅ Automatisable
- ✅ Peut être intégré dans CI/CD
- ✅ Meilleur pour multiple migrations

---

### **Option 3 : Via psql** (Pour utilisateurs avancés)

Si vous avez PostgreSQL installé :

```bash
# 1. Récupérer la connection string depuis Supabase Dashboard
# Settings → Database → Connection string (mode "Session")

# 2. Exécuter
psql "postgresql://postgres:[VOTRE-PASSWORD]@db.efeipwdpftgdeaemmkha.supabase.co:5432/postgres" \
  -f supabase/migrations/005_bi_turquoise_format_enhancements.sql
```

---

## ✅ Après l'exécution

Vérifiez que tout s'est bien passé :

```bash
npx ts-node scripts/verify-migration.ts
```

Ou manuellement dans le Dashboard SQL :

```sql
-- Vérifier structure events
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'events' 
  AND column_name IN ('description', 'hotel_name', 'arrival_date', 'pension_type')
ORDER BY column_name;

-- Vérifier event_room_pricing
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'event_room_pricing' 
  AND column_name IN ('price_per_person', 'price_per_room', 'deposit_amount')
ORDER BY column_name;

-- Vérifier company_settings existe
SELECT * FROM company_settings;
```

**Résultat attendu :**
- ❌ `description` et `hotel_name` n'existent plus dans `events`
- ✅ `arrival_date` et `pension_type` existent dans `events`
- ❌ `price_per_person` et `deposit_amount` n'existent plus dans `event_room_pricing`
- ✅ `price_per_room` existe dans `event_room_pricing`
- ✅ `company_settings` contient 1 ligne avec "Club Turquoise"

---

## 🔥 En cas d'erreur

Si vous voyez une erreur comme "column already exists" ou "table already exists", c'est que la migration a déjà été partiellement exécutée.

**Solution :** Toutes les instructions utilisent `IF NOT EXISTS` ou `IF EXISTS`, donc vous pouvez **ré-exécuter la migration sans risque**. Elle ignorera les parties déjà faites.

---

## 📝 Prochaine étape

Une fois la migration exécutée, testez le système :

```bash
# Démarrer le serveur Next.js
npm run dev
```

Puis allez sur http://localhost:3001/dashboard/evenements/nouveau et créez un nouvel événement pour tester les nouveaux champs !
