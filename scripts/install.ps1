# =====================================================
# TURQUOISE CRM - Script d'installation Windows
# =====================================================

Write-Host "🏝️ Installation de Turquoise CRM..." -ForegroundColor Cyan
Write-Host ""

# Vérifier que npm est installé
$npmVersion = & npm -v 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm n'est pas installé. Veuillez installer Node.js d'abord." -ForegroundColor Red
    exit 1
}

# Vérifier les versions
$nodeVersion = & node -v
Write-Host "✓ Node.js version : $nodeVersion" -ForegroundColor Green
Write-Host "✓ npm version : $npmVersion" -ForegroundColor Green
Write-Host ""

# Installer les dépendances
Write-Host "📦 Installation des dépendances..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ L'installation a échoué." -ForegroundColor Red
    Write-Host "Essayez : npm install --legacy-peer-deps" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "✅ Installation terminée !" -ForegroundColor Green
Write-Host ""

# Vérifier si .env.local existe
if (-Not (Test-Path .env.local)) {
    Write-Host "⚠️  Fichier .env.local non trouvé" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Suivez le guide SETUP_GUIDE.md pour configurer :" -ForegroundColor Cyan
    Write-Host "  1. Créer un compte Supabase"
    Write-Host "  2. Copier les clés API dans .env.local"
    Write-Host "  3. Exécuter les migrations SQL"
    Write-Host "  4. Créer un utilisateur admin"
    Write-Host ""
    Write-Host "Ensuite, lancez : npm run dev" -ForegroundColor Green
} else {
    Write-Host "✓ Fichier .env.local trouvé" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Prochaines étapes :" -ForegroundColor Cyan
    Write-Host "  1. Vérifiez que Supabase est configuré (voir SETUP_GUIDE.md)"
    Write-Host "  2. Lancez : npm run dev"
    Write-Host "  3. Ouvrez http://localhost:3000"
}

Write-Host ""
Write-Host "🎯 Documentation :" -ForegroundColor Cyan
Write-Host "  - SETUP_GUIDE.md : guide de configuration (5 min)"
Write-Host "  - README.md : vue d'ensemble"
Write-Host "  - docs/ARCHITECTURE_COMPLETE.md : architecture technique"
Write-Host ""
