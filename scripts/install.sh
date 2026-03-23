#!/bin/bash

# =====================================================
# TURQUOISE CRM - Script d'installation automatique
# =====================================================

echo "🏝️ Installation de Turquoise CRM..."
echo ""

# Vérifier que npm est installé
if ! command -v npm &> /dev/null; then
    echo "❌ npm n'est pas installé. Veuillez installer Node.js d'abord."
    exit 1
fi

# Vérifier les versions
echo "✓ Node.js version : $(node -v)"
echo "✓ npm version : $(npm -v)"
echo ""

# Installer les dépendances
echo "📦 Installation des dépendances..."
npm install

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ L'installation a échoué."
    echo "Essayez : npm install --legacy-peer-deps"
    exit 1
fi

echo ""
echo "✅ Installation terminée !"
echo ""

# Vérifier si .env.local existe
if [ ! -f .env.local ]; then
    echo "⚠️  Fichier .env.local non trouvé"
    echo ""
    echo "Suivez le guide SETUP_GUIDE.md pour configurer :"
    echo "  1. Créer un compte Supabase"
    echo "  2. Copier les clés API dans .env.local"
    echo "  3. Exécuter les migrations SQL"
    echo "  4. Créer un utilisateur admin"
    echo ""
    echo "Ensuite, lancez : npm run dev"
else
    echo "✓ Fichier .env.local trouvé"
    echo ""
    echo "📋 Prochaines étapes :"
    echo "  1. Vérifiez que Supabase est configuré (voir SETUP_GUIDE.md)"
    echo "  2. Lancez : npm run dev"
    echo "  3. Ouvrez http://localhost:3000"
fi

echo ""
echo "🎯 Documentation :"
echo "  - SETUP_GUIDE.md : guide de configuration (5 min)"
echo "  - README.md : vue d'ensemble"
echo "  - docs/ARCHITECTURE_COMPLETE.md : architecture technique"
echo ""
