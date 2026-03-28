# 🚀 Guide de Configuration (5 minutes)

Ce guide vous permet de lancer **Turquoise CRM** en 5 étapes simples.

---

## ✅ Prérequis

- **Node.js 18+** installé ([télécharger](https://nodejs.org/))
- **Compte Supabase** gratuit ([créer un compte](https://supabase.com))

---

## 📋 Étapes de Configuration

### **1. Créer un projet Supabase**

1. Allez sur [supabase.com](https://supabase.com)
2. Cliquez sur **"New project"**
3. Choisissez un nom (ex: `turquoise-crm`)
4. Définissez un mot de passe de base de données (⚠️ **sauvegardez-le !**)
5. Choisissez une région (ex: `eu-west`)
6. Cliquez sur **"Create project"** (⏱️ 2 minutes d'attente)

---

### **2. Copier les clés API**

1. Dans Supabase, allez dans **Settings** → **API**
2. Copiez ces deux valeurs :
   - **Project URL** (ex: `https://xxxxx.supabase.co`)
   - **Publishable key** (anon key) (commence par `eyJ...`)

3. Créez un fichier `.env.local` à la racine du projet :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...votre-cle-anon
```

⚠️ **Remplacez les valeurs par vos propres clés !**

---

### **3. Exécuter les migrations SQL**

1. Dans Supabase, allez dans **SQL Editor**
2. Cliquez sur **"New query"**
3. Copiez-collez le contenu de chaque fichier SQL dans l'ordre :
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_seed_data.sql`
   - `supabase/migrations/003_rls_policies.sql`
4. Cliquez sur **"Run"** après chaque fichier

✅ Votre base de données est maintenant créée avec 14 tables !

---

### **4. Créer un utilisateur admin**

1. Dans Supabase, allez dans **Authentication** → **Users**
2. Cliquez sur **"Add user"** → **"Create new user"**
3. Remplissez :
   - **Email** : votre email (ex: `admin@votreentreprise.com`)
   - **Password** : un mot de passe sécurisé (minimum 8 caractères)
   - **✅ Auto-confirm user** (important !)
4. Cliquez sur **"Create user"**

---

### **5. Installer et lancer l'application**

Dans votre terminal, à la racine du projet :

```bash
# Installer les dépendances
npm install

# Lancer l'application
npm run dev
```

🎉 **L'application est disponible sur** : [http://localhost:3000](http://localhost:3000)

---

## 🔐 Connexion

1. Ouvrez [http://localhost:3000](http://localhost:3000)
2. Connectez-vous avec :
   - **Email** : celui créé à l'étape 4
   - **Mot de passe** : celui défini à l'étape 4

---

## 🎨 Prochaines Étapes

Après connexion, vous pourrez :

- ✅ Créer vos premiers clients
- ✅ Ajouter des contacts
- ✅ Gérer des opportunités commerciales
- ✅ Suivre vos activités quotidiennes
- ✅ Générer des devis et factures

---

## 🆘 Problèmes Courants

### Erreur "Invalid API key"
➡️ Vérifiez que `.env.local` contient les bonnes clés (pas d'espaces, pas de guillemets)

### Erreur "relation does not exist"
➡️ Vérifiez que les 3 migrations SQL ont bien été exécutées dans l'ordre

### Erreur de connexion
➡️ Vérifiez que vous avez coché **"Auto-confirm user"** lors de la création de l'utilisateur

---

## 📚 Documentation Complète

Pour en savoir plus sur l'architecture et les fonctionnalités :

- 📖 **[ARCHITECTURE_COMPLETE.md](./ARCHITECTURE_COMPLETE.md)** - Documentation technique détaillée
- 📖 **[README.md](./README.md)** - Vue d'ensemble du projet

---

## 💬 Support

Si vous rencontrez un problème, consultez :

1. Les messages d'erreur dans la console du navigateur (F12)
2. Les logs du serveur dans votre terminal
3. La documentation Supabase : [docs.supabase.com](https://docs.supabase.com)

---

**Temps total estimé** : ⏱️ **5 minutes**

Bon développement ! 🚀