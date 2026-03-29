#!/bin/bash

# Script de monitoring des logs du serveur de développement
# Capture automatiquement les erreurs et les affiche

LOGFILE="dev-server.log"
LAST_LINE=26
ERRORS_FILE="detected-errors.txt"

> "$ERRORS_FILE"  # Réinitialiser le fichier des erreurs

echo "🔍 Monitoring des logs en cours... (vérification tous les 5 secondes)"
echo "Détection des erreurs, warnings, et problèmes Supabase"
echo ""

while true; do
  CURRENT_LINE=$(wc -l < "$LOGFILE")
  
  if [ "$CURRENT_LINE" -gt "$LAST_LINE" ]; then
    # Il y a de nouvelles lignes
    NEW_LINES=$((CURRENT_LINE - LAST_LINE))
    
    # Extraire et afficher les nouvelles lignes qui contiennent des erreurs
    tail -n "$NEW_LINES" "$LOGFILE" | while read line; do
      if echo "$line" | grep -iE "error|ERROR|Error|failed|FAIL|TypeError|SyntaxError|ReferenceError|enoent|ENOENT|unresolved|401|403|500|502|503" > /dev/null; then
        echo "❌ $line"
        echo "$line" >> "$ERRORS_FILE"
      elif echo "$line" | grep -iE "warn|⚠|deprecated" > /dev/null; then
        echo "⚠️  $line"
      elif echo "$line" | grep -iE "GET|POST|PUT|DELETE|PATCH" > /dev/null && echo "$line" | grep -E " [45][0-9]{2} " > /dev/null; then
        echo "⚠️  HTTP Error: $line"
        echo "$line" >> "$ERRORS_FILE"
      fi
    done
    
    LAST_LINE="$CURRENT_LINE"
  fi
  
  sleep 5
done
