# 🚀 GUIDE DE SETUP — 5 MINUTES CHRONO

> **Tout est déjà prêt !** Vous n'avez que 4 actions ultra-simples à faire.

---

## ✅ ÉTAPE 1 : Créer un compte Supabase (2 minutes)

1. Allez sur [supabase.com](https://supabase.com)
2. Cliquez **"Start your project"**
3. Connectez-vous avec GitHub (ou créez un compte)
4. Cliquez **"New project"**
5. Remplissez :
   - **Name** : `turquoise-crm`
   - **Database Password** : inventez un mot de passe fort (notez-le quelque part)
   - **Region** : choisissez le plus proche (ex: `Europe West (Paris)`)
6. Cliquez **"Create new project"**
7. ⏳ Attendez 2 minutes (le temps que Supabase provisionne la base de données)

---

## ✅ ÉTAPE 2 : Copier les clés API (30 secondes)

Dans votre projet Supabase :

1. Allez dans **Settings** (⚙️ en bas à gauche) → **API**
2. Vous verrez :
   - **Project URL** : `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
3. **Copiez ces 2 valeurs**

Maintenant dans VS Code :

1. Ouvrez le fichier `.env.local.example`
2. **Dupliquez-le** et renommez la copie en `.env.local`
3. Collez vos valeurs :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

4. Sauvegardez (Cmd+S / Ctrl+S)

✅ **Terminé !** Le fichier `.env.local` ne sera jamais commité sur GitHub (déjà dans `.gitignore`).

---

## ✅ ÉTAPE 3 : Exécuter les migrations SQL (2 minutes)

Dans Supabase :

1. Allez dans **SQL Editor** (icône ⚡ dans le menu)
2. Cliquez **"New query"**
3. Ouvrez le fichier `supabase/migrations/001_initial_schema.sql` dans VS Code
4. **Copiez tout le contenu** (Cmd+A puis Cmd+C)
5. **Collez dans l'éditeur SQL** de Supabase
6. Cliquez **"Run"** (bouton vert en bas à droite)
7. ✅ Vous devriez voir "Success. No rows returned"

Répétez pour les 2 autres fichiers :

- `supabase/migrations/002_seed_data.sql`
- `supabase/migrations/003_rls_policies.sql`

✅ **Terminé !** Votre base de données est créée avec données de démo.

---

## ✅ ÉTAPE 4 : Créer votre premier utilisateur admin (1 minute)

Dans Supabase :

1. Allez dans **Authentication** → **Users**
2. Cliquez **"Add user"** → **"Create new user"**
3. Remplissez :
   - **Email** : votre email (ex: `admin@turquoise-crm.com`)
   - **Password** : inventez un mot de passe (vous le retaperez pour vous connecter)
   - ✅ **Auto Confirm User** : cochez cette case
4. Cliquez **"Create user"**
5. Notez l'**UUID** du user (vous en aurez besoin)

Maintenant, retournez dans **SQL Editor** :

```sql
-- Remplacez l'UUID par celui de votre user
SELECT create_demo_admin_user(
  'uuid-de-votre-user-ici'::uuid,
  'admin@turquoise-crm.com',
  'Admin',
  'Turquoise'
);
```

6. Cliquez **"Run"**

✅ **Terminé !** Vous avez créé un utilisateur admin avec tous les droits.

---

## ✅ ÉTAPE 5 : Installer et lancer (1 minute)

Dans le terminal VS Code :

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

⏳ Attendez que l'installation se termine (1-2 minutes)

Quand vous voyez :

```
✓ Ready in 2.5s
○ Local: http://localhost:3000
```

---

## 🎉 FÉLICITATIONS !

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

**Connectez-vous avec :**
- Email : celui que vous avez créé
- Password : celui que vous avez défini

🏝️ **Bienvenue dans Turquoise CRM !**

---

## 🆘 EN CAS DE PROBLÈME

### Erreur "SUPABASE_URL is not defined"
→ Vérifiez que le fichier `.env.local` existe et contient bien vos clés

### Erreur "relation does not exist"
→ Vous avez oublié d'exécuter les migrations SQL (Étape 3)

### Page blanche ou erreur 500
→ Vérifiez la console du navigateur (F12) et le terminal pour les messages d'erreur

### Impossible de se connecter
→ Vérifiez que vous avez bien coché "Auto Confirm User" lors de la création

---

## 📞 BESOIN D'AIDE ?

Si quelque chose ne fonctionne pas :
1. Vérifiez que vous avez bien suivi les 5 étapes
2. Redémarrez le serveur (Ctrl+C puis `npm run dev`)
3. Vérifiez les logs dans le terminal

---

**TEMPS TOTAL : 5-6 MINUTES** ⏱️

**C'est tout ! Vous n'avez rien d'autre à configurer.** 🚀
