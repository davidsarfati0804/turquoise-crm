#!/bin/bash
# Double-cliquer sur ce fichier pour démarrer Nanoclaw

NANOCLAW_DIR="$HOME/nanoclaw"

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "🌊 Turquoise CRM — Démarrage Nanoclaw WhatsApp"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Vérifier que le dossier nanoclaw existe
if [ ! -d "$NANOCLAW_DIR" ]; then
  echo ""
  echo -e "${RED}❌ Dossier nanoclaw introuvable : $NANOCLAW_DIR${NC}"
  echo ""
  echo "Modifie ce script et change NANOCLAW_DIR par le bon chemin."
  echo "Ex: NANOCLAW_DIR=\"\$HOME/Documents/nanoclaw\""
  echo ""
  read -p "Appuie sur Entrée pour fermer..."
  exit 1
fi

cd "$NANOCLAW_DIR"

# Vérifier si PM2 est installé
if ! command -v pm2 &> /dev/null; then
  echo -e "${YELLOW}⚙️  Installation de PM2...${NC}"
  npm install -g pm2
fi

# Vérifier si Nanoclaw tourne déjà
STATUS=$(pm2 describe nanoclaw 2>/dev/null | grep "status" | head -1)

if echo "$STATUS" | grep -q "online"; then
  echo ""
  echo -e "${GREEN}✅ Nanoclaw est déjà actif !${NC}"
  echo ""
  pm2 status nanoclaw
else
  echo ""
  echo -e "${YELLOW}▶️  Démarrage de Nanoclaw...${NC}"
  pm2 start npm --name nanoclaw -- start 2>/dev/null || pm2 start npm --name nanoclaw -- run dev
  pm2 save
  sleep 2
  echo ""
  pm2 status nanoclaw
  echo ""
  echo -e "${GREEN}✅ Nanoclaw démarré ! WhatsApp connecté.${NC}"
fi

echo ""
echo "📱 Le CRM reçoit maintenant les messages WhatsApp en temps réel."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Commandes utiles :"
echo "  pm2 logs nanoclaw    → voir les logs"
echo "  pm2 stop nanoclaw    → arrêter"
echo "  pm2 restart nanoclaw → redémarrer"
echo ""
read -p "Appuie sur Entrée pour fermer cette fenêtre..."
