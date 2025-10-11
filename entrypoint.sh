#!/bin/sh

# Définir les chemins
CONFIG_DIR="/usr/src/app/config"
HISTORY_DIR="$CONFIG_DIR/history"
DEFAULTS_DIR="/app-defaults"

# S'assurer que le répertoire de configuration principal existe
mkdir -p "$CONFIG_DIR"

# Vérifier si le fichier de configuration principal existe
if [ ! -f "$CONFIG_DIR/locations.json" ]; then
  echo "Le fichier locations.json n'existe pas dans le volume monté."
  echo "Copie de la configuration par défaut..."
  
  # Copier le fichier de configuration et le répertoire des drapeaux
  cp "$DEFAULTS_DIR/locations.json" "$CONFIG_DIR/locations.json"
  cp -r "$DEFAULTS_DIR/flags" "$CONFIG_DIR/"
  
  echo "Configuration par défaut copiée."
else
  echo "Configuration existante trouvée."
fi

# S'assurer que le sous-répertoire pour l'historique existe
mkdir -p "$HISTORY_DIR"
echo "Le répertoire de l'historique est prêt."

echo "Démarrage de l'application..."
# Exécuter la commande principale de l'application (démarrer le serveur Node.js)
exec "$@"