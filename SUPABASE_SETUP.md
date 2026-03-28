# 🔧 GUIDE DE DÉPLOIEMENT SUPABASE

## 📋 Étapes pour exécuter la migration

### Option 1: Via Supabase Dashboard (Recommandé)

1. **Se connecter à Supabase**
   - Aller sur https://supabase.com/dashboard
   - Se connecter avec votre compte
   - Sélectionner votre projet Turquoise CRM

2. **Ouvrir le SQL Editor**
   - Dans le menu de gauche, cliquer sur "SQL Editor"
   - Ou aller directement sur: `https://supabase.com/dashboard/project/[VOTRE_PROJECT_ID]/sql`

3. **Exécuter la migration**
   - Cliquer sur "New query"
   - Ouvrir le fichier `supabase/migrations/004_travel_agency_schema.sql`
   - Copier tout le contenu (Cmd+A, Cmd+C)
   - Coller dans le SQL Editor (Cmd+V)
   - Cliquer sur "Run" ou appuyer sur Cmd+Enter
   - ✅ Vous devriez voir "Success. No rows returned"

4. **Vérifier que ça a fonctionné**
   - Aller dans "Table Editor"
   - Vérifier que ces tables existent:
     - events
     - room_types
     - event_room_pricing
     - leads
     - client_files
     - participants
     - payment_links
     - invoices
     - activity_logs
     - internal_notes
     - bulletin_inscriptions

5. **Vérifier les types de chambres**
   - Dans Table Editor, ouvrir la table `room_types`
   - Vous devriez voir 4 lignes:
     - Junior Suite
     - Premium Suite
     - Family
     - Ocean Front

### Option 2: Via Supabase CLI

Si vous avez installé Supabase CLI:

```bash
# 1. Se connecter (si pas déjà fait)
supabase login

# 2. Lier le projet local au projet Supabase
supabase link --project-ref [VOTRE_PROJECT_ID]

# 3. Appliquer la migration
supabase db push

# Alternative: exécuter la migration directement
supabase db execute --file supabase/migrations/004_travel_agency_schema.sql
```

### Option 3: Via psql (avancé)

Si vous avez le connection string de votre DB:

```bash
psql "postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres" -f supabase/migrations/004_travel_agency_schema.sql
```

## ⚠️ En cas d'erreur

### Erreur: "relation already exists"
C'est normal! La migration utilise `CREATE TABLE IF NOT EXISTS`, donc:
- ✅ Elle ne créera que les tables qui n'existent pas
- ✅ Les données existantes ne seront pas touchées
- ✅ Vous pouvez continuer

### Erreur: "permission denied"
Vérifiez que:
- Vous êtes bien connecté avec le bon compte
- Votre rôle a les permissions d'administration
- Vous utilisez le bon projet Supabase

### Erreur: "duplicate key value violates unique constraint"
Cela signifie que les types de chambres existent déjà:
- ✅ C'est parfait! La migration utilise `ON CONFLICT DO NOTHING`
- ✅ Les données existantes sont préservées
- ✅ Vous pouvez continuer

## 🧪 Tests après migration

### 1. Tester l'accès aux données

Dans SQL Editor, exécuter:

```sql
-- Vérifier les types de chambres
SELECT * FROM room_types ORDER BY display_order;

-- Vérifier la structure des tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'events', 'room_types', 'event_room_pricing', 
    'leads', 'client_files', 'participants',
    'bulletin_inscriptions'
  );

-- Vérifier les policies RLS
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

### 2. Tester via l'application

1. **Créer un événement**
   ```
   http://localhost:3001/dashboard/evenements/nouveau
   ```
   - Les 4 types de chambres doivent s'afficher
   - Les champs prix doivent être présents

2. **Vérifier l'enregistrement**
   Dans Supabase Table Editor:
   - Ouvrir `events` → voir le nouvel événement
   - Ouvrir `event_room_pricing` → voir les prix enregistrés

3. **Tester le BI**
   - Aller sur un dossier client
   - Cliquer "Générer le Bulletin d'Inscription"
   - Vérifier qu'il se génère sans erreur
   - Dans Supabase, vérifier `bulletin_inscriptions` contient le nouveau BI

## 🔐 Configuration RLS (si nécessaire)

Si vous avez des problèmes de permissions, vérifiez les policies:

```sql
-- Vérifier RLS activé
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Toutes doivent avoir rowsecurity = true

-- Si une table n'a pas RLS activé:
ALTER TABLE [nom_table] ENABLE ROW LEVEL SECURITY;

-- Ajouter policy si manquante:
CREATE POLICY "Allow authenticated users to manage [table]"
    ON [table_name]
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
```

## 🌐 Configuration des variables d'environnement

Vérifiez que votre `.env.local` contient:

```env
NEXT_PUBLIC_SUPABASE_URL=https://[VOTRE_PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[VOTRE_ANON_KEY]
```

Pour trouver ces valeurs:
1. Aller sur Supabase Dashboard
2. Project Settings → API
3. Copier "Project URL" et "anon public"

## 📊 Monitoring

Après la migration, surveillez:

1. **Logs Supabase**
   - Dashboard → Logs
   - Vérifier qu'il n'y a pas d'erreurs

2. **Storage utilisé**
   - Dashboard → Settings → Usage
   - Vérifier que la DB n'est pas pleine

3. **Performance**
   - Si lenteur, créer des index supplémentaires:
   ```sql
   CREATE INDEX idx_custom ON table_name(column_name);
   ```

## 🆘 Support

En cas de problème:

1. **Vérifier les logs Next.js**
   ```bash
   # Dans le terminal où tourne npm run dev
   # Chercher les erreurs "Supabase" ou "database"
   ```

2. **Vérifier les logs du navigateur**
   ```
   F12 → Console
   Chercher les erreurs en rouge
   ```

3. **Vérifier Supabase Dashboard**
   ```
   Logs → chercher les erreurs récentes
   ```

4. **Rollback si nécessaire**
   ```sql
   -- Supprimer toutes les nouvelles tables
   DROP TABLE IF EXISTS bulletin_inscriptions CASCADE;
   DROP TABLE IF EXISTS internal_notes CASCADE;
   DROP TABLE IF EXISTS activity_logs CASCADE;
   DROP TABLE IF EXISTS invoices CASCADE;
   DROP TABLE IF EXISTS payment_links CASCADE;
   DROP TABLE IF EXISTS participants CASCADE;
   DROP TABLE IF EXISTS client_files CASCADE;
   DROP TABLE IF EXISTS leads CASCADE;
   DROP TABLE IF EXISTS event_room_pricing CASCADE;
   DROP TABLE IF EXISTS room_types CASCADE;
   DROP TABLE IF EXISTS events CASCADE;
   ```

---

## ✅ Checklist de vérification

Après avoir exécuté la migration, cocher:

- [ ] Migration exécutée sans erreur dans SQL Editor
- [ ] Table `room_types` contient 4 entrées
- [ ] Table `events` existe et est vide (ou contient des événements)
- [ ] Table `bulletin_inscriptions` existe
- [ ] RLS est activé sur toutes les tables
- [ ] Policies sont créées
- [ ] Application se connecte sans erreur
- [ ] Création d'événement affiche les 4 types de chambres
- [ ] Aucune erreur dans les logs du navigateur
- [ ] Aucune erreur dans les logs Supabase

## 🎉 Une fois terminé

Votre système de BI est prêt!

Vous pouvez maintenant:
- ✅ Créer des événements avec prix
- ✅ Générer des bulletins d'inscription
- ✅ Envoyer les BI via WhatsApp
- ✅ Suivre l'historique des envois

---

**Besoin d'aide?** 
- Documentation Supabase: https://supabase.com/docs
- SQL Editor: https://supabase.com/docs/guides/database
- RLS: https://supabase.com/docs/guides/auth/row-level-security
